import { Helmet } from 'react-helmet-async';
import { CONFIG } from 'src/config-global';
import { RoleListView } from 'src/sections/role/view';

const metadata = { title: `Role - ${CONFIG.site.name}` };

export default function RolePage() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <RoleListView />
    </>
  );
}