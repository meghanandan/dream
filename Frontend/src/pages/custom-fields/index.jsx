import { Helmet } from 'react-helmet-async';
import { CONFIG } from 'src/config-global';
// import { CustomFields } from 'src/sections/custom-fields/view/list-view';
import {CustomField } from 'src/sections/custom-fields/view/list-view'

const metadata = { title: `Custom Fields - ${CONFIG.site.name}` };

export default function CustomFields() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <CustomField/>
    </>
  );
}