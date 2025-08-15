import { Helmet } from 'react-helmet-async';
import { CONFIG } from 'src/config-global';
import CustomerOnboarding from 'src/sections/customeronboard/list-view';

const metadata = { title: `Customer On Boarding - ${CONFIG.site.name}` };

export default function CustomerOnBoard() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <CustomerOnboarding />
    </>
  );
}