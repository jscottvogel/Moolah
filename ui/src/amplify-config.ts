import { Amplify } from 'aws-amplify';
import config from '../amplify_outputs.json' with { type: 'json' };

console.log("[AMPLIFY] Configuring with data provider:", config.data ? "YES" : "NO");
Amplify.configure(config);
