import { Helmet } from 'react-helmet-async';
import { CONFIG } from 'src/config-global';
// import { CustomFields } from 'src/sections/custom-fields/view/list-view';
import {APIConfiguration } from 'src/sections/configuration/view/index';

const metadata = { title: `API Configuration - ${CONFIG.site.name}` };

export default function APIConfig() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <APIConfiguration/>
    </>
  );
}