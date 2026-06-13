import { useEffect, useState } from "react";
import { setupApi, type Check, type Task } from "../api/setup";
import { PreflightCheckCard } from "./PreflightCheckCard";
import { SecretInput } from "./SecretInput";
import { TaskProgress } from "./TaskProgress";

const steps = ["Welcome", "Host Check", "Docker Setup", "Runtime Location", "Server Identity", "Funcom Token", "Ports", "Review", "Install", "Finish"];
const regions = ["Europe", "North America", "South America", "Asia", "Oceania", "Africa"];
type SetupConfig = { SERVER_TITLE: string; SERVER_REGION: string; SERVER_IP: string; SERVER_IP_MODE: string; SERVER_PROVIDER: string; STEAM_APP_ID: string };

export function SetupWizard({ initialStep = 0, jumpNonce = 0 }: { initialStep?: number; jumpNonce?: number }) {
  const [step, setStep] = useState(initialStep);
  const [checks, setChecks] = useState<Check[]>([]);
  const [task, setTask] = useState<Task | null>(null);
  const [token, setToken] = useState("");
  const [config, setConfig] = useState<SetupConfig>({ SERVER_TITLE: "My Dune Server", SERVER_REGION: "Europe", SERVER_IP: "auto", SERVER_IP_MODE: "public", SERVER_PROVIDER: "dune-docker", STEAM_APP_ID: "4754530" });

  useEffect(() => {
    setStep(Math.max(0, Math.min(initialStep, steps.length - 1)));
  }, [initialStep, jumpNonce]);

  async function runPreflight() {
    const result = await setupApi.preflight();
    setChecks(result.checks);
  }

  async function saveConfig() {
    await setupApi.writeConfig(config);
    if (token) await setupApi.saveToken(token);
  }

  async function init() {
    await saveConfig();
    const result = await setupApi.init();
    setTask(result.task);
  }

  return (
    <section className="wizard">
      <div className="stepper">
        {steps.map((label, index) => <button key={label} className={index === step ? "active" : ""} onClick={() => setStep(index)}>{index + 1}. {label}</button>)}
      </div>
      <div className="panel">
        {step === 0 && <>
          <h2>Welcome to Dune Docker Console</h2>
          <p>A Docker-powered Dune server stack with a built-in web admin panel. It is an unofficial community self-hosting tool.</p>
          <ul className="requirements">
            <li>Best experience: run it directly on a Linux server.</li>
            <li>Also possible: Docker Desktop on Windows/WSL2 or a virtual machine.</li>
            <li>You will need your Funcom self-host token and a server with enough CPU, memory, disk, and open game ports.</li>
          </ul>
        </>}
        {step === 1 && <>
          <h2>Host Check</h2>
          <p className="muted">If this server is already running, some ports may show as in use by the current stack. Treat that as normal unless the check names an unrelated process.</p>
          <button onClick={runPreflight}>Run Checks</button>
          <div className="check-grid">{checks.map((check) => <PreflightCheckCard key={check.name} check={check} />)}</div>
        </>}
        {step === 2 && <>
          <h2>Docker Setup</h2>
          <p>The console checks Docker for you. If Docker, Compose, or the Docker service is missing, stopped, or unavailable, the installer handles the Linux repair before the Web UI opens. If you are using Docker Desktop or a VM, the wizard tells you what needs attention.</p>
        </>}
        {step === 3 && <>
          <h2>Runtime Location</h2>
          <p>The backend is using the repository path configured by <code>DUNE_DOCKER_DIR</code> or its working directory.</p>
        </>}
        {step === 4 && <>
          <h2>Server Identity</h2>
          <div className="setup-form-grid">
            <label>Server Title<input value={config.SERVER_TITLE} onChange={(event) => setConfig({ ...config, SERVER_TITLE: event.target.value })} /></label>
            <label>Region<select value={config.SERVER_REGION} onChange={(event) => setConfig({ ...config, SERVER_REGION: event.target.value })}>{regions.map((region) => <option key={region} value={region}>{region}</option>)}</select></label>
            <label>Install mode<select value={config.SERVER_IP_MODE} onChange={(event) => setConfig({ ...config, SERVER_IP_MODE: event.target.value })}><option value="public">Public</option><option value="local">Local</option></select></label>
            <label>Server IP<input value={config.SERVER_IP} onChange={(event) => setConfig({ ...config, SERVER_IP: event.target.value })} /></label>
            <label>Provider<input value={config.SERVER_PROVIDER} onChange={(event) => setConfig({ ...config, SERVER_PROVIDER: event.target.value })} /></label>
            <label>Steam app ID<input value={config.STEAM_APP_ID} onChange={(event) => setConfig({ ...config, STEAM_APP_ID: event.target.value })} /></label>
          </div>
        </>}
        {step === 5 && <>
          <h2>Funcom Token</h2>
          <p>The token is stored at <code>runtime/secrets/funcom-token.txt</code> with restrictive permissions and redacted from logs.</p>
          <SecretInput value={token} onChange={(event) => setToken(event.target.value)} placeholder="Paste token" />
        </>}
        {step === 6 && <>
          <h2>Ports and Firewall</h2>
          <div className="action-sections">
            <section className="action-section success-panel">
              <h4>Public Router Forwarding</h4>
              <p>For a normal public server, forward these ports from your router/firewall to this Docker host:</p>
              <ul className="requirements">
                <li><strong>UDP 7777-7810</strong> for Dune game server traffic.</li>
                <li><strong>TCP 31982</strong> for RabbitMQ game traffic.</li>
              </ul>
              <p className="muted">This is the port guidance most users need.</p>
            </section>
            <section className="action-section">
              <h4>Admin Panel</h4>
              <p>Dune Docker Console listens on 8088/tcp by default. Do not expose it publicly. Use LAN access, VPN, SSH tunnel, or a protected reverse proxy.</p>
            </section>
            <section className="action-section">
              <h4>Game Map Ports</h4>
              <p>Game UDP ports start at 7777 and increase as maps are started. Overmap commonly uses 7777 and Survival_1 commonly uses 7778. The 7777-7810 range covers normal map growth.</p>
            </section>
            <section className="action-section">
              <h4>Internal Map Traffic</h4>
              <p>IGW/S2S UDP ports start at 7888 for map-to-map traffic inside the stack. Do not forward these publicly for a normal single-host Docker setup.</p>
            </section>
            <section className="action-section">
              <h4>Do Not Publicly Expose</h4>
              <p>Keep the web admin, Postgres, Director, TextRouter, RabbitMQ admin, RabbitMQ HTTP, and other internal service ports private.</p>
            </section>
          </div>
          <p className="danger-note">Only forward internal ports if you are intentionally building an advanced multi-host setup and know why they are needed.</p>
        </>}
        {step === 7 && <>
          <h2>Review</h2>
          <div className="action-sections">
            <section className="action-section">
              <h4>Server Identity</h4>
              <ReviewGrid items={[
                ["Title", config.SERVER_TITLE],
                ["Region", config.SERVER_REGION],
                ["Mode", titleCase(config.SERVER_IP_MODE)],
                ["Server IP", config.SERVER_IP],
                ["Provider", config.SERVER_PROVIDER],
                ["Steam App ID", config.STEAM_APP_ID]
              ]} />
            </section>
            <section className="action-section">
              <h4>Network / Ports</h4>
              <ReviewGrid items={[
                ["Public Game UDP", "7777-7810/udp"],
                ["Public RabbitMQ Game", "31982/tcp"],
                ["Admin Panel", "8088/tcp private only"],
                ["Internal Services", "Do not expose publicly"]
              ]} />
            </section>
            <section className="action-section">
              <h4>Auth / Token</h4>
              <ReviewGrid items={[
                ["Funcom token", token ? "Ready to save" : "Not entered in this session"],
                ["Admin auth", "Enabled unless ADMIN_AUTH_DISABLED is set"],
                ["Secret storage", "runtime/secrets with restrictive permissions"]
              ]} />
            </section>
            <section className="action-section warning-panel">
              <h4>Warnings / Missing Values</h4>
              <ul className="requirements">
                {!token && <li>Funcom token was not entered in this wizard session. Existing token file may still be used if present.</li>}
                {config.SERVER_IP === "auto" && <li>Server IP is set to auto. Confirm Home readiness after setup to verify advertised IP.</li>}
                <li>Initial setup can initialize or reset local world state. Create backups before destructive setup work.</li>
              </ul>
            </section>
          </div>
          <details className="technical-details">
            <summary>Advanced review data</summary>
            <pre className="mini-output">{JSON.stringify(config, null, 2)}</pre>
          </details>
          <p className="danger-note">Initial setup can initialize or reset local world state. Review before continuing.</p>
        </>}
        {step === 8 && <>
          <h2>Install / Initialize / Start</h2>
          <button onClick={init}>Run Existing Dune Init</button>
          <TaskProgress task={task} />
        </>}
        {step === 9 && <>
          <h2>Finish</h2>
          <p>Open the dashboard, check readiness, view logs, create a backup, or manage players.</p>
        </>}
        <div className="wizard-controls">
          <button disabled={step === 0} onClick={() => setStep(step - 1)}>Back</button>
          <button disabled={step === steps.length - 1} onClick={() => setStep(step + 1)}>Next</button>
        </div>
      </div>
    </section>
  );
}

function ReviewGrid({ items }: { items: [string, string][] }) {
  return <div className="key-value-grid">{items.map(([label, value]) => <div className="key-value-item" key={label}>
    <span>{label}</span>
    <strong>{value || "Not set"}</strong>
  </div>)}</div>;
}

function titleCase(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}
