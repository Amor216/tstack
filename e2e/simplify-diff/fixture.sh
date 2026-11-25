set -e
bash "$(dirname "$0")/../_lib/todo-app.sh"
python - <<'PY'
p = "todo/cli.py"; s = open(p, encoding="utf-8").read()
helpers = '''

def count_open_tasks(tasks, include_done=False, verbose=False):
    # This function counts the open tasks
    # We loop over all tasks
    result = 0
    for task in tasks:
        # check if task is not done
        if task.done == False:
            result = result + 1
    return result


def count_done_tasks(tasks):
    # This function counts the done tasks
    result = 0
    for task in tasks:
        # check if task is done
        if task.done == True:
            result = result + 1
    return result
'''
s = s.replace("\n\ndef main", helpers + "\n\ndef main")
s = s.replace('    elif cmd == "list":', '    elif cmd == "stats":\n        # print the statistics\n        print(f"offen: {count_open_tasks(store.load())}, erledigt: {count_done_tasks(store.load())}")\n    elif cmd == "list":')
open(p, "w", encoding="utf-8").write(s)
PY
git -c user.name=e -c user.email=e@e commit -qam "stats command"
wc -l < todo/cli.py > .before_lines
