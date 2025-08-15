import { Helmet } from 'react-helmet-async';
import { CONFIG } from 'src/config-global';
import {Adjustments } from 'src/sections/adjustment/view/list-view';

const metadata = { title: `Adjustment - ${CONFIG.site.name}` };

export default function Adjustment() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <Adjustments/>
    </>
  );
}