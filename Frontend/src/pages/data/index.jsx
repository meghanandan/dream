import { Helmet } from 'react-helmet-async';
import { CONFIG } from 'src/config-global';
import { OrdersAndDisputes } from 'src/sections/data/view/list-view';

const metadata = { title: `Data - ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <OrdersAndDisputes />
    </>
  );
}
