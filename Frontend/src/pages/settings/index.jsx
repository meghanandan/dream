import { Helmet } from 'react-helmet-async';
import { CONFIG } from 'src/config-global';
import { Settings } from 'src/sections/settings/view';

const metadata = { title: `Disputes - ${CONFIG.site.name}` };

export default function DisputesPage() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <Settings />
    </>
  );
}