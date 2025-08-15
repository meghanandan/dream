import { Helmet } from 'react-helmet-async';
import { CONFIG } from 'src/config-global';
import { Payments } from 'src/sections/payments/view/list-view';

const metadata = { title: `Payments - ${CONFIG.site.name}` };

export default function Payment() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <Payments />
    </>
  );
}
