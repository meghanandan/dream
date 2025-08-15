import { Helmet } from 'react-helmet-async';
import { CONFIG } from 'src/config-global';
import {DataSources } from 'src/sections/data-sources/view/index';

const metadata = { title: `Data Sources - ${CONFIG.site.name}` };

export default function DataSource() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <DataSources/>
    </>
  );
}