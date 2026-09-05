import { createClient } from '@/lib/supabase/server';
import type { DsaProblem } from '@/types';

type Row={id:string;topic_id:string|null;title:string;slug:string;difficulty:DsaProblem['difficulty'];pattern:string;summary:string;problem:string;examples:string;constraints:string;hint:string;brute_force:string;optimized:string;time_complexity:string;space_complexity:string;starter_code:string;solution:string;test_cases:unknown};
function mapProblem(row:Row):DsaProblem{return {id:row.id,topicId:row.topic_id??undefined,title:row.title,slug:row.slug,difficulty:row.difficulty,pattern:row.pattern,summary:row.summary,problem:row.problem,examples:row.examples,constraints:row.constraints,hint:row.hint,bruteForce:row.brute_force,optimized:row.optimized,timeComplexity:row.time_complexity,spaceComplexity:row.space_complexity,starterCode:row.starter_code,solution:row.solution,testCases:typeof row.test_cases==='string'?row.test_cases:JSON.stringify(row.test_cases??[],null,2)};}
const select='id,topic_id,title,slug,difficulty,pattern,summary,problem,examples,constraints,hint,brute_force,optimized,time_complexity,space_complexity,starter_code,solution,test_cases';
export async function getDsaProblems(){try{const supabase=await createClient();const{data,error}=await supabase.from('dsa_problems').select(select).eq('published',true).order('title');if(error)return{problems:[],error:error.message};return{problems:(data??[]).map(row=>mapProblem(row as Row))}}catch(error){return{problems:[],error:error instanceof Error?error.message:'Unable to load DSA problems.'}}}
export async function getDsaProblem(slug:string){try{const supabase=await createClient();const{data,error}=await supabase.from('dsa_problems').select(select).eq('slug',slug).eq('published',true).maybeSingle();if(error||!data)return{problem:undefined,error:error?.message};return{problem:mapProblem(data as Row)}}catch(error){return{problem:undefined,error:error instanceof Error?error.message:'Unable to load DSA problem.'}}}
export async function getDsaTopics(){try{if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)return [];const supabase=await createClient();const{data}=await supabase.from('dsa_topics').select('id,name,slug,description').eq('published',true).order('sort_order').order('name');return data??[]}catch{return []}}

export async function getDsaNavigationProblems(){
  try {
    const supabase=await createClient();
    const {data,error}=await supabase.from('dsa_problems').select('id,topic_id,title,slug,difficulty').eq('published',true).order('title');
    if(error)return{problems:[],error:error.message};
    return{problems:(data??[]).map(row=>({id:row.id,topicId:row.topic_id??undefined,title:row.title,slug:row.slug,difficulty:row.difficulty}))};
  }catch(error){
    return{problems:[],error:error instanceof Error?error.message:'Unable to load DSA navigation.'};
  }
}
