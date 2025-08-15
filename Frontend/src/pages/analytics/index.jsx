import { Helmet } from 'react-helmet-async';
import { CONFIG } from 'src/config-global';
import { AnalyticsDashboard } from 'src/sections/analytics/view';

const metadata = { title: `Analytics - ${CONFIG.site.name}` };

export default function DisputesPage() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <AnalyticsDashboard />
    </>
  );
}