import cp from "child_process";

export function truncateDb() {
    cp.execSync(`${process.env.PWD}/scripts/truncate-test-db.sh`);
}
