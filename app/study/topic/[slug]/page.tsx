import { notFound } from 'next/navigation';
import { getTopicBySlug } from '@/lib/study-data';
import { TopicWorkspace } from '@/components/study/topic-workspace';
import { createClient } from '@/lib/supabase/server';

export default async function TopicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { topic, category, library } = await getTopicBySlug(slug);
  if (!topic) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: progress }, { data: savedNote }] = user
    ? await Promise.all([
        supabase.from('topic_progress').select('progress').eq('user_id', user.id).eq('topic_id', topic.id).maybeSingle(),
        supabase.from('personal_notes').select('content').eq('user_id', user.id).eq('topic_id', topic.id).maybeSingle(),
      ])
    : [{ data: null }, { data: null }];
  const index = library.topics.findIndex((item) => item.id === topic.id);
  return <main className="page"><div className="container topic-page-content"><TopicWorkspace topic={topic} prev={index > 0 ? library.topics[index - 1] : undefined} next={index >= 0 ? library.topics[index + 1] : undefined} initialProgress={progress?.progress ?? 0} initialNote={savedNote?.content ?? ''} category={category}/></div></main>;
}
