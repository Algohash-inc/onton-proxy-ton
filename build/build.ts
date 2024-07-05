import fs from "fs";
import path from "path";
import glob from "fast-glob";
import { compileContract } from "ton-compiler";
import { Cell } from "ton";

async function main() {
	console.log(`=================================================================`);
	console.log(`Build script running, let's find some FunC contracts to compile..`);

	// go over all the root contracts in the contracts directory
	const rootContracts = glob.sync(["contracts/*.fc", "contracts/*.func"]);

	for (const rootContract of rootContracts) {
		const contractName = path.parse(rootContract).name;
		if (contractName == "common") break;
		console.log(`\n* Found contract '${contractName}' - let's compile it:`);

		let result = await compileContract({
			files: [rootContract]
		});

		if (!result.ok) {
			console.error(`\n* Compilation failed!`);
			console.error(result.log);
			return;
		}

		const fiftArtifact = `build/${contractName}.fif`;
		const mergedFuncArtifact = `build/${contractName}.merged.fc`;
		const fiftCellArtifact = `build/${contractName}.cell.fif`;
		const cellArtifact = `build/${contractName}.cell`;
		const hexArtifact = `build/${contractName}.compiled.json`;

		console.log(` - Deleting old build artifact...`);
		glob.sync([fiftArtifact, mergedFuncArtifact, fiftCellArtifact, cellArtifact, hexArtifact]).map((f) => {
			fs.unlinkSync(f);
		});

		let fiftCellSource = '"Asm.fif" include\n' + result.fift + "\n";
		fs.writeFileSync(`build/${contractName}.fif`, fiftCellSource.replace(/\\n/g, "\n"), "utf8");
		fs.writeFileSync(`build/${contractName}.cell`, result.output as Buffer);

		// make sure cell build artifact was created
		if (!fs.existsSync(cellArtifact)) {
			console.log(` - For some reason '${cellArtifact}' was not created!`);
			process.exit(1);
		} else {
			console.log(` - Build artifact created '${cellArtifact}'`);
		}

		fs.writeFileSync(
			hexArtifact,
			JSON.stringify({
				hex: Cell.fromBoc(fs.readFileSync(cellArtifact))[0].toBoc().toString("hex")
			})
		);

		// Remove intermediary
		fs.unlinkSync(cellArtifact);

		// make sure hex artifact was created
		if (!fs.existsSync(hexArtifact)) {
			console.log(` - For some reason '${hexArtifact}' was not created!`);
			process.exit(1);
		} else {
			console.log(` - Build artifact created '${hexArtifact}'`);
		}
	}

	console.log(``);
}

main();
