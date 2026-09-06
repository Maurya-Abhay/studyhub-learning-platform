import { NextResponse } from 'next/server';
import { getDsaNavigationProblems, getDsaTopics } from '@/lib/dsa-data';
import { getApiUser } from '@/lib/api-security';

export async function GET() {
  const { user } = await getApiUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  try {
    const [topics, { problems }] = await Promise.all([getDsaTopics(), getDsaNavigationProblems()]);
    return NextResponse.json({ topics, problems });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load DSA navigation.' }, { status: 500 });
  }
}