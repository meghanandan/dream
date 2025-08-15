import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { JwtPasswordView } from 'src/sections/auth/jwt';

// ----------------------------------------------------------------------

const metadata = { title: `Password | Jwt - ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <JwtPasswordView/>
    </>
  );
}
