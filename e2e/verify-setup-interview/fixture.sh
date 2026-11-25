set -e
bash "$(dirname "$0")/../_lib/todo-app.sh"
sed -i "/^Verify:/d" AGENTS.md && git -c user.name=e -c user.email=e@e commit -qam "no verification yet"
