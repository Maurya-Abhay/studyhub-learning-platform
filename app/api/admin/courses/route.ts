import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function getAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, response: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) };
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin') return { supabase, response: NextResponse.json({ error: 'Admin access required.' }, { status: 403 }) };
  return { supabase, user };
}
function slugify(value:string){return value.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,120)}
function ids(value:unknown):string[]{ if(!Array.isArray(value)) return []; return Array.from(new Set(value.filter((x): x is string => typeof x==='string' && x.length>0))); }
async function syncLinks(supabase:Awaited<ReturnType<typeof createClient>>,courseId:string,categoryIds:string[],topicIds:string[]){
  const categoryDelete = await supabase.from('course_categories').delete().eq('course_id',courseId);
  if (categoryDelete.error) throw new Error(`Unable to reset course categories: ${categoryDelete.error.message}`);
  const topicDelete = await supabase.from('course_topics').delete().eq('course_id',courseId);
  if (topicDelete.error) throw new Error(`Unable to reset course topics: ${topicDelete.error.message}`);
  if(categoryIds.length) {
    const categoryInsert = await supabase.from('course_categories').insert(categoryIds.map((categoryId,i)=>({course_id:courseId,category_id:categoryId,sort_order:i})));
    if (categoryInsert.error) throw new Error(`Unable to save course categories: ${categoryInsert.error.message}`);
  }
  let resolvedTopicIds = topicIds;
  if (!topicIds.length && categoryIds.length) {
    const { data: categoryTopics, error: categoryTopicsError } = await supabase.from('study_topics').select('id,category_id,sort_order').in('category_id', categoryIds).eq('published', true).order('sort_order').order('title');
    if (categoryTopicsError) throw new Error(`Unable to resolve category topics: ${categoryTopicsError.message}`);
    resolvedTopicIds = (categoryTopics ?? []).map((topic) => topic.id);
  }
  if(resolvedTopicIds.length) {
    const topicInsert = await supabase.from('course_topics').insert(resolvedTopicIds.map((topicId,i)=>({course_id:courseId,topic_id:topicId,sort_order:i})));
    if (topicInsert.error) throw new Error(`Unable to save course topics: ${topicInsert.error.message}`);
  }
}
function payload(body:Record<string,unknown>){
  const title=typeof body.title==='string'?body.title.trim():'';
  if(!title) throw new Error('Course title is required.');
  return {title,slug:typeof body.slug==='string'&&body.slug.trim()?body.slug.trim():slugify(title),description:typeof body.description==='string'?body.description.trim():'',access_type:body.accessType==='paid'?'paid':'free',price:Math.max(0,Number(body.price)||0),unlock_days:Math.max(0,Number(body.unlockDays??body.unlock_days)||0),required_progress:Math.min(100,Math.max(0,Number(body.requiredProgress??body.required_progress)||0)),passing_score:Math.min(100,Math.max(0,Number(body.passingScore??body.passing_score)||70)),certificate_enabled:body.certificateEnabled!==false,published:body.published===true};
}
export async function GET(){const {supabase,response}=await getAdmin();if(response)return response;const [{data:courses,error},{data:categories},{data:topics},{data:links},{data:categoryLinks}]=await Promise.all([supabase.from('courses').select('*').order('title'),supabase.from('study_categories').select('id,name').eq('published',true).order('sort_order').order('name'),supabase.from('study_topics').select('id,title,category_id').eq('published',true).order('sort_order').order('title'),supabase.from('course_topics').select('course_id,topic_id,sort_order').order('sort_order'),supabase.from('course_categories').select('course_id,category_id,sort_order').order('sort_order')]);if(error)return NextResponse.json({error:error.message},{status:500});return NextResponse.json({courses:courses??[],categories:categories??[],topics:topics??[],topicLinks:Object.fromEntries((courses??[]).map(c=>[c.id,(links??[]).filter(l=>l.course_id===c.id).sort((a,b)=>a.sort_order-b.sort_order).map(l=>l.topic_id)])),courseCategoryLinks:Object.fromEntries((courses??[]).map(c=>[c.id,(categoryLinks??[]).filter(l=>l.course_id===c.id).sort((a,b)=>a.sort_order-b.sort_order).map(l=>l.category_id)]))})}
export async function POST(request:Request){const {supabase,response}=await getAdmin();if(response)return response;let body:Record<string,unknown>;try{body=await request.json()}catch{return NextResponse.json({error:'Invalid JSON body.'},{status:400})}if(body.action==='bulk'){const records=Array.isArray(body.records)?body.records:[];if(!records.length)return NextResponse.json({error:'records must be a non-empty array.'},{status:400});if(records.length>500)return NextResponse.json({error:'Bulk imports are limited to 500 records per request.'},{status:413});const results=[];for(const raw of records){const item=raw as Record<string,unknown>;const base=payload(item);const {data:course,error}=await supabase.from('courses').insert(base).select().single();if(error)return NextResponse.json({error:error.message},{status:400});await syncLinks(supabase,course.id,ids(item.categoryIds),ids(item.topicIds));results.push(course)}return NextResponse.json({courses:results,imported:results.length},{status:201})}try{const base=payload(body);const {data:course,error}=await supabase.from('courses').insert(base).select().single();if(error)return NextResponse.json({error:error.message},{status:400});await syncLinks(supabase,course.id,ids(body.categoryIds),ids(body.topicIds));return NextResponse.json({course},{status:201})}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to create course.'},{status:400})}}
export async function PATCH(request:Request){const {supabase,response}=await getAdmin();if(response)return response;let body:Record<string,unknown>;try{body=await request.json()}catch{return NextResponse.json({error:'Invalid JSON body.'},{status:400})}const id=typeof body.id==='string'?body.id:'';if(!id)return NextResponse.json({error:'Course id is required.'},{status:400});try{const {data:existing}=await supabase.from('courses').select('slug').eq('id',id).maybeSingle();const nextBody=!body.slug&&existing?.slug?{...body,slug:existing.slug}:body;const {data:course,error}=await supabase.from('courses').update(payload(nextBody)).eq('id',id).select().single();if(error)return NextResponse.json({error:error.message},{status:400});await syncLinks(supabase,id,ids(body.categoryIds),ids(body.topicIds));return NextResponse.json({course})}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to update course.'},{status:400})}}
export async function DELETE(request:Request){const {supabase,response}=await getAdmin();if(response)return response;const id=new URL(request.url).searchParams.get('id');if(!id)return NextResponse.json({error:'Course id is required.'},{status:400});const {error}=await supabase.from('courses').delete().eq('id',id);if(error)return NextResponse.json({error:error.message},{status:400});return NextResponse.json({ok:true})}
