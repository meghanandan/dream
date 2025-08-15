import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

const metadata = { title: `Blank - ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>
      Test
    </>
  );
}
