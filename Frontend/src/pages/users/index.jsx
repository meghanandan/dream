import { Helmet } from 'react-helmet-async';
import { CONFIG } from 'src/config-global';
import { Settings } from 'src/sections/settings/view';
// import { USerListView } from 'src/sections/users/view';
import { UserListView } from 'src/sections/users/view';

const metadata = { title: `Disputes - ${CONFIG.site.name}` };

export default function UsersPage() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <UserListView/>
    </>
  );
}