import { NextResponse } from 'next/server';
import { getDsaNavigationProblems, getDsaTopics } from '@/lib/dsa-data';

export async function GET() {
  try {
    const [topics, { problems }] = await Promise.all([getDsaTopics(), getDsaNavigationProblems()]);
    return NextResponse.json({ topics, problems });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load DSA navigation.' }, { status: 500 });
  }
}