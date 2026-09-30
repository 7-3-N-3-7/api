import sys
from ruamel.yaml import YAML

def refactor(filepath):
    yaml = YAML()
    yaml.preserve_quotes = True
    
    with open(filepath, 'r') as f:
        data = yaml.load(f)
        
    if not data or 'services' not in data:
        return
        
    all_secrets = set()
    
    for service_name, service in data['services'].items():
        if 'environment' in service:
            envs = service['environment']
            
            # Convert dict to list of key=value for uniform processing
            if isinstance(envs, dict):
                env_list = [f"{k}={v}" for k, v in envs.items()]
            else:
                env_list = envs
                
            new_secrets = []
            
            for env in env_list:
                if '=' in env:
                    key, val = env.split('=', 1)
                else:
                    key = env
                    val = None
                    
                secret_name = key.lower().replace('_file', '')
                all_secrets.add(key.replace('_FILE', ''))
                new_secrets.append(secret_name)
                
                
            if 'secrets' in service:
                service['secrets'].extend([s for s in new_secrets if s not in service['secrets']])
            else:
                service['secrets'] = new_secrets
            
            # For Postgres and Mongo, we append _FILE to the environment variables
            # For others, we assume they use our entrypoint script, so we can delete the environment block
            if service_name in ['business-db', 'auth-db', 'mongodb']:
                new_envs = []
                for env in env_list:
                    if '=' in env:
                        key, val = env.split('=', 1)
                    else:
                        key = env
                    # Ensure we don't duplicate _FILE
                    if not key.endswith('_FILE'):
                        key = f"{key}_FILE"
                    new_envs.append(f"{key}=/run/secrets/{key.lower().replace('_file', '')}")
                if 'environment' in service:
                    service['environment'] = new_envs
            elif service_name in ['traefik', 'zookeeper', 'kafka', 'redis', 'oauth2-proxy']:
                # Third party, needs command injection
                if 'environment' in service:
                    del service['environment']
                if 'command' in service:
                    orig_cmd = service['command']
                    if isinstance(orig_cmd, list):
                        orig_cmd = " ".join(orig_cmd)
                    
                    exports = " && ".join([f"export {k}=$(cat /run/secrets/{k.lower().replace('_file','')})" for k in [env.split('=')[0] for env in env_list]])
                    service['command'] = f'/bin/sh -c "{exports} && exec {orig_cmd}"'
                else:
                    # Fallback commands if no command specified
                    fallback = "run"
                    if service_name == "kafka": fallback = "/etc/confluent/docker/run"
                    elif service_name == "zookeeper": fallback = "/etc/confluent/docker/run"
                    elif service_name == "redis": fallback = "redis-server"
                    elif service_name == "keycloak": fallback = "/opt/keycloak/bin/kc.sh start-dev"
                    elif service_name == "oauth2-proxy": fallback = "/bin/oauth2-proxy"
                    
                    exports = " && ".join([f"export {k}=$(cat /run/secrets/{k.lower().replace('_file','')})" for k in [env.split('=')[0] for env in env_list]])
                    service['command'] = f'/bin/sh -c "{exports} && exec {fallback}"'
            else:
                # Custom app (frontend, backend), we already added entrypoint-secrets.sh
                if 'environment' in service:
                    del service['environment']
                
    # Add top-level secrets block
    if 'secrets' not in data:
        data['secrets'] = {}
        
    for key in all_secrets:
        secret_name = key.lower().replace('_file', '')
        if secret_name not in data['secrets']:
            data['secrets'][secret_name] = {'environment': key.replace('_FILE', '')}
        
    with open(filepath, 'w') as f:
        yaml.dump(data, f)

if __name__ == "__main__":
    for f in sys.argv[1:]:
        refactor(f)
