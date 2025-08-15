import { Helmet } from 'react-helmet-async';
import { CONFIG } from 'src/config-global';
import { Home } from 'src/sections/home/view';

const metadata = { title: `Home - ${CONFIG.site.name}` };

export default function HomePage() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <Home />
    </>
  );
}