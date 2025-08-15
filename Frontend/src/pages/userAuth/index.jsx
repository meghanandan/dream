import { Helmet } from 'react-helmet-async';
import { CONFIG } from 'src/config-global';
import { Login } from 'src/sections/userAuth/view';

const metadata = { title: `Home - ${CONFIG.site.name}` };

export default function userAuth() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <Login />
    </>
  );
}