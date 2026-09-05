import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { Category } from '@/types';

export function CategoryCard({ item }: { item: Category }) {
  return (
    <Link href={item.slug === 'dsa' ? '/dsa' : `/study/category/${item.slug}`} className="surface card category-card">
      <div className="category-icon">{item.icon}</div>
      <div className="grow">
        <h3>{item.name}</h3>
        <p>{item.description}</p>
      </div>
      <div className="meta-row">
        <span className="chip">{item.topicCount} {item.slug === 'dsa' ? 'problems' : 'topics'}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--brand)' }}>
        Start learning <ArrowUpRight size={15} />
      </div>
    </Link>
  );
}
