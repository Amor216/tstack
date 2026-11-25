set -e
bash "$(dirname "$0")/../_lib/todo-app.sh"
sed -i 's/if t.id == task_id:/if t.id >= task_id:/' todo/store.py
git -c user.name=e -c user.email=e@e commit -qam "bug"
git rev-parse HEAD > .e2e-base
