import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { RoadmapManager } from '@/components/admin/roadmap-manager';

export default function RoadmapsPage() {
  return <DashboardShell admin><RoadmapManager /></DashboardShell>;
}
