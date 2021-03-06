const MAX_SPEED_X = 2.2
const MAX_SPEED_Y = 4.1
const GRAVITY = 0.3
const FRICTION = 0.08

export default async (systemName, { system }) => system
	.addEventListener('mounted', ({ indexComponents }) => {
		indexComponents(['staticPhysicsBody', 'physicsBody'])
	})

	.addEventListener('update', ({ entities, deltaTime, timestamp }) => {
		const staticComponents = entities.getIndexed('staticPhysicsBody')
		const nonstaticComponents = entities.getIndexed('physicsBody')

		nonstaticComponents.forEach((c) => {
			const state = c.getParentEntity().getComponent('state')
			const wasGrounded = state.grounded
			const wasWallCollided = state.wallCollided
			const wasAtEdge = state.atEdge
			state.wallCollided = false
			state.atEdge = false
			state.grounded = false // Only set to true after a collision is detected

			c.accY = GRAVITY // Add gravity (limit to 10)

			// Add acceleration to "speed"
			const time = deltaTime / 10
			if (time !== 0) {
				c.spdX = c.spdX + (c.accX / time)
				c.spdY = c.spdY + (c.accY / time)
			}

			// Limit speed
			c.spdX = c.spdX >= 0 ? Math.min(c.spdX, MAX_SPEED_X) : Math.max(c.spdX, MAX_SPEED_X * -1)
			c.spdY = c.spdY >= 0 ? Math.min(c.spdY, MAX_SPEED_Y) : Math.max(c.spdY, MAX_SPEED_Y * -1)

			// Use speed to change position
			c.x += c.spdX
			c.y += c.spdY

			// Check for static physics body collision
			staticComponents.forEach((c2) => {
				const halfWidthSum = c.halfWidth + c2.halfWidth
				const halfHeightSum = c.halfHeight + c2.halfHeight
				const deltaX = c2.midPointX - c.midPointX
				const deltaY = c2.midPointY - c.midPointY
				const absDeltaX = Math.abs(deltaX)
				const absDeltaY = Math.abs(deltaY)

				// Collision Detection
				if (
					(halfWidthSum > absDeltaX) &&
					(halfHeightSum > absDeltaY)
				) {
					let projectionY = halfHeightSum - absDeltaY // Value used to correct positioning
					let projectionX = halfWidthSum - absDeltaX  // Value used to correct positioning

					// Use the lesser of the two projection values
					if (projectionY < projectionX) {
						if (deltaY > 0) projectionY *= -1

						c.y += projectionY // Apply "projection vector" to rect1
						if (c.spdY > 0 && deltaY > 0 || c.spdY < 0 && deltaY < 0) c.spdY = 0

						if (projectionY < 0) {
							state.groundHit = !wasGrounded
							state.grounded = true
							c.spdX = c.spdX > 0
								? Math.max(c.spdX - (FRICTION / time), 0)
								: Math.min(c.spdX + (FRICTION / time), 0)
						}
					} else {
						if (deltaX > 0) projectionX *= -1

						c.x += projectionX // Apply "projection vector" to rect1
						if (c.spdX > 0 && deltaX > 0 || c.spdX < 0 && deltaX < 0) c.spdX = 0
						state.wallCollided = !wasAtEdge && !wasWallCollided
					}

					// Edge Detection
					if (state.grounded) {
						const edgeAbsDeltaX = absDeltaX + c.width
						const edgeAbsDeltaY = absDeltaY - 1
						if (
							!(
								(halfWidthSum > edgeAbsDeltaX) &&
								(halfHeightSum > edgeAbsDeltaY)
							)
						) {
							state.atEdge = !wasAtEdge && !wasWallCollided
						}
					}
				}
			})

			// Check for non-static physics body collision
			nonstaticComponents.forEach((c2) => {
				const halfWidthSum = c.halfWidth + c2.halfWidth
				const halfHeightSum = c.halfHeight + c2.halfHeight
				const absDeltaX = Math.abs(c2.midPointX - c.midPointX)
				const absDeltaY = Math.abs(c2.midPointY - c.midPointY)

				// Collision Detection
				if (
					(halfWidthSum > absDeltaX) &&
					(halfHeightSum > absDeltaY)
				) {
					const entity1 = c.getParentEntity()
					const entity2 = c2.getParentEntity()
					const c1Type = entity1.getComponent('being').type
					const c2Type = entity2.getComponent('being').type

					// Figure out if the collision was Player <-> Monster and which entity is the Player
					let playerEntity
					if (c1Type === 'Monster' && c2Type === 'Player') {
						playerEntity = entity2
					} else if (c2Type === 'Monster' && c1Type === 'Player') {
						playerEntity = entity1
					} else {
						return
					}

					const playerHealth = playerEntity.getComponent('health')
					if (playerHealth.damagedTimestamp === null || timestamp - playerHealth.damagedTimestamp > 1000) {
						playerHealth.damagedTimestamp = timestamp
						playerHealth.hp = Math.max(playerHealth.hp - 10, 0)
					}
				}
			})
		})
	})
