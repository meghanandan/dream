import { Helmet } from 'react-helmet-async';
import { CONFIG } from 'src/config-global';
import { Templates } from 'src/sections/templates/view';

const metadata = { title: `Templates - ${CONFIG.site.name}` };

export default function TemplatesPage() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <Templates />
    </>
  );
}