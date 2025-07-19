export function generateJoinCode(n: number = 6): string {
	const characters = "0123456789ABCDEFGHIJLKMNOPQRSTUVWXYZ"
	let joinCode = ""
	for (let i = 0; i < n; i++) {
		const randomIndex = Math.floor(Math.random() * characters.length)
		joinCode += characters[randomIndex]
	}
	return joinCode
}
