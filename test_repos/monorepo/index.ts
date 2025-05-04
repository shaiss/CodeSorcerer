import { pokerAgent } from "./src/agent";

async function main() {
  await pokerAgent.init();
  await pokerAgent.run(1, { verbose: true });
}

main();
