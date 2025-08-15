import { Helmet } from 'react-helmet-async';
import { CONFIG } from 'src/config-global';
import {Dispute } from 'src/sections/dispute/view/list-view';

const metadata = { title: `Disputes - ${CONFIG.site.name}` };

export default function Disputes() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <Dispute/>
    </>
  );
}