import { createClient } from '@/lib/supabase/server';
import type { Category, Topic } from '@/types';

type CategoryRow = { id: string; name: string; slug: string; description: string; icon: string; sort_order: number };
type TopicRow = {
  id: string; category_id: string | null; title: string; slug: string; difficulty: Topic['difficulty']; estimated_minutes: number;
  summary: string; concept: string; explanation: string; mental_model: string | null; real_example: string | null;
  code_example: string | null; code_language: string | null; output: string | null; common_mistakes: unknown;
  practice_task: string | null; interview_questions: unknown; published: boolean; sort_order: number;
};

export type StudyLibrary = { categories: Category[]; topics: Topic[]; error?: string };

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

const htmlTopicFallbacks: Record<string, Pick<Topic, 'summary' | 'concept' | 'explanation' | 'mentalModel' | 'realExample' | 'practiceTask' | 'interviewQuestions'>> = {
  'what-is-html': {
    summary: 'Understand what HTML is and how it gives structure to every web page.',
    concept: 'HTML (HyperText Markup Language) is the standard language used to structure content on the web. It describes what each piece of content means, such as a heading, paragraph, link, image, or form.',
    explanation: 'HTML uses elements made from tags. A browser reads those elements and builds the page structure. HTML is about meaning and structure; CSS controls appearance and JavaScript adds behavior.',
    mentalModel: 'Think of HTML as the frame of a house: it creates rooms and doors, while CSS paints the rooms and JavaScript makes the doors work.',
    realExample: 'A blog post usually uses one h1 for its title, p elements for paragraphs, and a elements for links to related articles.',
    practiceTask: 'Create a page with one heading, two paragraphs, and a link to another website.',
    interviewQuestions: ['What is HTML used for?', 'What is the difference between HTML, CSS, and JavaScript?'],
  },
  'doctype-declaration': {
    summary: 'Learn why every modern HTML document starts with a DOCTYPE declaration.',
    concept: 'The DOCTYPE declaration tells the browser which standards mode to use when interpreting the document. In HTML5, the declaration is simply <!DOCTYPE html>.',
    explanation: 'DOCTYPE is not an HTML element and it does not appear as page content. It is a short instruction at the top of the file that helps browsers render the document consistently.',
    mentalModel: 'Think of DOCTYPE as the label on a set of instructions: it tells the browser which rulebook the document follows.',
    realExample: 'A valid HTML page begins with <!DOCTYPE html>, followed by the html, head, and body elements.',
    practiceTask: 'Create a new HTML file and place <!DOCTYPE html> on the first line. Then add a title and one paragraph.',
    interviewQuestions: ['Why is <!DOCTYPE html> used?', 'Is DOCTYPE an HTML tag?'],
  },
  'html-document-structure': {
    summary: 'Understand the essential structure shared by every HTML document.',
    concept: 'An HTML document normally contains html as the root element, head for metadata, and body for visible page content.',
    explanation: 'The head stores information such as the page title and stylesheets. The body contains headings, text, images, links, and other content that visitors can see and interact with.',
    mentalModel: 'The html element is the building, head is its blueprint and settings, and body is the visible space people use.',
    realExample: 'A page title belongs inside head, while a heading such as Welcome belongs inside body.',
    practiceTask: 'Build a complete document with html, head, title, body, h1, and p elements.',
    interviewQuestions: ['What is the purpose of head and body?', 'Which element is the root of an HTML document?'],
  },
};

function toTopic(row: TopicRow): Topic {
  const fallback = htmlTopicFallbacks[row.slug];
  return {
    id: row.id,
    categoryId: row.category_id ?? '',
    title: row.title,
    slug: row.slug,
    difficulty: row.difficulty,
    estimatedMinutes: row.estimated_minutes,
    summary: row.summary || fallback?.summary || '',
    concept: row.concept || fallback?.concept || '',
    explanation: row.explanation || fallback?.explanation || '',
    mentalModel: row.mental_model || fallback?.mentalModel,
    realExample: row.real_example || fallback?.realExample,
    codeExample: row.code_example ?? undefined,
    codeLanguage: row.code_language ?? undefined,
    output: row.output ?? undefined,
    commonMistakes: asStringArray(row.common_mistakes),
    practiceTask: row.practice_task || fallback?.practiceTask,
    interviewQuestions: asStringArray(row.interview_questions).length ? asStringArray(row.interview_questions) : fallback?.interviewQuestions,
    published: row.published,
    order: row.sort_order,
  };
}

function configured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

const topicSelect = 'id,category_id,title,slug,difficulty,estimated_minutes,summary,concept,explanation,mental_model,real_example,code_example,code_language,output,common_mistakes,practice_task,interview_questions,published,sort_order';

export async function getStudyLibrary(): Promise<StudyLibrary> {
  if (!configured()) return { categories: [], topics: [], error: 'Supabase is not configured.' };
  try {
    const supabase = await createClient();
    const [{ data: categories, error: categoryError }, { data: topics, error: topicError }] = await Promise.all([
      supabase.from('study_categories').select('id,name,slug,description,icon,sort_order').eq('published', true).order('sort_order').order('name'),
      supabase.from('study_topics').select(topicSelect).eq('published', true).order('sort_order').order('title'),
    ]);
    const error = categoryError ?? topicError;
    if (error) return { categories: [], topics: [], error: error.message };
    const categoryRows = (categories ?? []) as CategoryRow[];
    const topicRows = (topics ?? []) as TopicRow[];
    const mappedTopics = topicRows.map(toTopic);
    const mappedCategories = categoryRows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      icon: row.icon,
      moduleCount: 0,
      topicCount: mappedTopics.filter((topic) => topic.categoryId === row.id).length,
    }));
    return { categories: mappedCategories, topics: mappedTopics };
  } catch (error) {
    return { categories: [], topics: [], error: error instanceof Error ? error.message : 'Unable to load study content.' };
  }
}

export async function getTopicBySlug(slug: string) {
  if (!configured()) return { library: { categories: [], topics: [], error: 'Supabase is not configured.' }, topic: undefined, category: undefined };
  try {
    const supabase = await createClient();
    const { data: topicRow, error } = await supabase.from('study_topics').select(topicSelect).eq('slug', slug).eq('published', true).maybeSingle();
    if (error || !topicRow) return { library: await getStudyLibrary(), topic: undefined, category: undefined };
    const topic = toTopic(topicRow as TopicRow);
    const [{ data: categoryRow }, { data: siblingRows }] = await Promise.all([
      topic.categoryId ? supabase.from('study_categories').select('id,name,slug,description,icon,sort_order').eq('id', topic.categoryId).eq('published', true).maybeSingle() : Promise.resolve({ data: null }),
      topic.categoryId ? supabase.from('study_topics').select(topicSelect).eq('category_id', topic.categoryId).eq('published', true).order('sort_order').order('title') : Promise.resolve({ data: [] }),
    ]);
    const category = categoryRow ? {
      id: categoryRow.id, name: categoryRow.name, slug: categoryRow.slug, description: categoryRow.description, icon: categoryRow.icon,
      moduleCount: 0, topicCount: (siblingRows ?? []).length,
    } : undefined;
    return { library: { categories: category ? [category] : [], topics: (siblingRows ?? []).map((row) => toTopic(row as TopicRow)) }, topic, category };
  } catch (error) {
    return { library: await getStudyLibrary(), topic: undefined, category: undefined, error: error instanceof Error ? error.message : 'Unable to load topic.' };
  }
}

export async function searchStudy(query: string) {
  if (!configured() || !query.trim()) return { categories: [], topics: [], courses: [], dsa: [] as Array<{ id: string; title: string; slug: string; difficulty: string; pattern: string; summary: string }> };
  const supabase = await createClient();
  const q = `%${query.trim()}%`;
  const [categories, topics, courses, dsa] = await Promise.all([
    supabase.from('study_categories').select('id,name,slug,description').eq('published', true).or(`name.ilike.${q},description.ilike.${q}`).limit(8),
    supabase.from('study_topics').select('id,title,slug,summary,difficulty,estimated_minutes').eq('published', true).or(`title.ilike.${q},summary.ilike.${q},explanation.ilike.${q}`).limit(20),
    supabase.from('courses').select('id,title,slug,description,access_type').eq('published', true).or(`title.ilike.${q},description.ilike.${q}`).limit(8),
    supabase.from('dsa_problems').select('id,title,slug,difficulty,pattern,summary').eq('published', true).or(`title.ilike.${q},pattern.ilike.${q},summary.ilike.${q}`).limit(12),
  ]);
  return { categories: categories.data ?? [], topics: topics.data ?? [], courses: courses.data ?? [], dsa: dsa.data ?? [] };
}
