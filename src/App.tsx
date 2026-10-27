import { CRM } from "@/components/zephvion-crm/root/CRM";

/**
 * Zephvion CRM entry point.
 *
 * Built on Atomic CRM (MIT, Marmelab). Zephvion branding and domain defaults
 * (logo, title, currency, deal stages and categories) live in
 * src/components/zephvion-crm/root/defaultConfiguration.ts; any of them can
 * still be overridden here through <CRM> props.
 *
 * Telemetry is disabled so the app never reports its hostname to Marmelab.
 */
const App = () => <CRM disableTelemetry />;

export default App;
