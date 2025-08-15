import { Helmet } from 'react-helmet-async';
import { CONFIG } from 'src/config-global';
// import {SetUpDreamData } from 'src/sections/setup/view/list-view';
import {SetUpDreamData } from 'src/sections/setup/view/list-view';

const metadata = { title: `Set Up - ${CONFIG.site.name}` };

export default function DataSetUp() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <SetUpDreamData/>
    </>
  );
}