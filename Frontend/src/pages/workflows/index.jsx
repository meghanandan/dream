import { Helmet } from 'react-helmet-async';
import { CONFIG } from 'src/config-global';
import { Workflows } from 'src/sections/workflows/view';

const metadata = { title: `Workflows - ${CONFIG.site.name}` };

export default function WorkflowsPage() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <Workflows  />
    </>
  );
}