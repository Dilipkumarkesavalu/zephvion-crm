import { CRM } from "@/components/zephvion-crm/root/CRM";
import {
  authProvider,
  dataProvider,
} from "@/components/zephvion-crm/providers/fakerest";
import { memoryStore } from "ra-core";

const App = () => (
  <CRM
    dataProvider={dataProvider}
    authProvider={authProvider}
    store={memoryStore()}
  />
);

export default App;
