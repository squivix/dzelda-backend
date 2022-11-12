import cp from "child_process";

export function clearDb() {
    cp.execSync("scripts/clear-test-db.sh");
}
