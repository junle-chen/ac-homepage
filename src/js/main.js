class GridAnimation {
	constructor(canvas, options = {}) {
		this.canvas = canvas;
		this.ctx = canvas.getContext("2d");
		this.options = {
			direction: options.direction || "right",
			speed: options.speed || 1,
			borderColor: options.borderColor || "rgba(255, 255, 255, 0.05)",
			squareSize: options.squareSize || 40,
			hoverFillColor: options.hoverFillColor || "rgba(255, 255, 255, 0.6)",
			hoverShadowColor: options.hoverShadowColor || "rgba(255, 255, 255, 0.3)",
			transitionDuration: options.transitionDuration || 200, // 过渡时间（毫秒）
			trailDuration: options.trailDuration || 1000, // 痕迹持续时间（毫秒）
			specialBlockColor:
				options.specialBlockColor || "rgba(255, 100, 100, 0.8)",
			specialHoverColor:
				options.specialHoverColor || "rgba(100, 255, 100, 0.8)",
			// 新增颜色渐变相关选项
			snakeHeadColor: options.snakeHeadColor || "rgba(255, 255, 255, 0.9)",
			snakeTailColor: options.snakeTailColor || "rgba(100, 100, 255, 0.3)",
			snakeGradientStops: options.snakeGradientStops || 5, // 渐变过渡的色块数
			snakeColorDecay: options.snakeColorDecay || 0.7, // 渐变衰减系数，越小衰减越快
			// 移动端触摸相关选项
			touchSensitivity: options.touchSensitivity || 1.0, // 触摸灵敏度
			vibrationEnabled: options.vibrationEnabled || false, // 是否启用震动反馈
			...options,
		};

		this.gridOffset = { x: 0, y: 0 };
		this.hoveredSquare = null;
		this.animationFrame = null;
		this.currentOpacity = 0;
		this.targetOpacity = 0;
		this.lastTimestamp = 0;
		this.hoverRadius = 3;
		this.trailSquares = new Map(); // 存储痕迹格子的信息
		this.specialBlock = null;
		this.specialBlockTimer = null;
		this.isSpecialBlockHovered = false;
		this.snakeBody = []; // 存储蛇身的数组
		this.shouldGrow = false; // 控制蛇身是否增长
	}

	init() {
		this.resizeCanvas();
		this.setupEventListeners();

		// 移动端性能优化
		if (isPhone) {
			this.optimizeForMobile();
		}

		this.animate();

		// 在移动设备上延迟创建食物，确保画布大小计算正确
		if (isPhone) {
			setTimeout(() => {
				this.createSpecialBlock();
			}, 500);
		} else {
			this.createSpecialBlock();
		}

		// 添加页面可见性变化监听，在页面不可见时暂停动画
		document.addEventListener(
			visibilityChangeEvent,
			this.handleVisibilityChange.bind(this)
		);
	}

	optimizeForMobile() {
		// 检测设备性能, 默认高性能模式
		const canvas = this.canvas;
		const ctx = canvas.getContext("2d");

		// 简单的性能测试
		const startTime = performance.now();
		for (let i = 0; i < 1000; i++) {
			ctx.fillRect(0, 0, 1, 1);
		}
		const endTime = performance.now();
		const performanceScore = endTime - startTime;

		// 根据性能调整设置
		if (performanceScore > 10) {
			// 低性能设备
			this.options.squareSize = Math.max(this.options.squareSize * 1.5, 60);
			this.options.speed *= 0.7;
			this.options.trailDuration *= 0.5;
		} else if (performanceScore > 5) {
			// 中等性能设备
			this.options.squareSize = Math.max(this.options.squareSize * 1.2, 50);
			this.options.speed *= 0.8;
		}
	}

	resizeCanvas() {
		// 处理设备像素比，确保在高DPR设备上（如iPhone）清晰渲染
		const dpr = window.devicePixelRatio || 1;
		const displayWidth = this.canvas.offsetWidth;
		const displayHeight = this.canvas.offsetHeight;

		// 设置画布大小为实际像素大小
		this.canvas.width = Math.floor(displayWidth * dpr);
		this.canvas.height = Math.floor(displayHeight * dpr);

		// 设置CSS尺寸为显示尺寸
		this.canvas.style.width = `${displayWidth}px`;
		this.canvas.style.height = `${displayHeight}px`;

		// 缩放上下文以匹配设备像素比
		this.ctx.scale(dpr, dpr);
	}

	setupEventListeners() {
		window.addEventListener("resize", () => this.resizeCanvas());
		this.canvas.addEventListener("mousemove", (e) => this.handleMouseMove(e));
		this.canvas.addEventListener("mouseleave", () => this.handleMouseLeave());

		// 移动端触摸事件处理
		if (isPhone) {
			this.setupTouchEvents();
		}

		// 监听设备方向变化，重新创建食物
		if (isPhone && window.orientation !== undefined) {
			window.addEventListener("orientationchange", () => {
				setTimeout(() => {
					this.resizeCanvas();
					this.createSpecialBlock();
				}, 300);
			});
		}
	}

	setupTouchEvents() {
		let touchStartPos = null;
		let touchMovePos = null;
		let isTouching = false;
		let lastTouchTime = 0;
		let touchCount = 0;

		// 保存事件处理函数引用以便后续移除
		this.handleTouchStart = (e) => {
			e.preventDefault();
			const now = Date.now();

			// 防止过于频繁的触摸事件
			if (now - lastTouchTime < 16) {
				// 约60fps限制
				return;
			}
			lastTouchTime = now;

			if (e.touches.length === 1) {
				const touch = e.touches[0];
				const rect = this.canvas.getBoundingClientRect();
				touchStartPos = {
					x: touch.clientX - rect.left,
					y: touch.clientY - rect.top,
					time: now,
				};
				isTouching = true;
				touchCount++;

				// 立即处理触摸开始位置
				this.handleTouchMove(touchStartPos.x, touchStartPos.y);

				// 如果之前没有蛇头，设置目标透明度
				if (!this.hoveredSquare) {
					this.targetOpacity = 0.8 * this.options.touchSensitivity;
				}

				// 添加触摸开始时的视觉反馈
				if (this.options.vibrationEnabled && navigator.vibrate) {
					navigator.vibrate(10); // 轻微震动反馈
				}
			}
		};

		this.handleTouchMoveEvent = (e) => {
			e.preventDefault();
			if (isTouching && e.touches.length === 1) {
				const touch = e.touches[0];
				const rect = this.canvas.getBoundingClientRect();
				touchMovePos = {
					x: touch.clientX - rect.left,
					y: touch.clientY - rect.top,
				};

				// 处理触摸移动
				this.handleTouchMove(touchMovePos.x, touchMovePos.y);
			}
		};

		this.handleTouchEndEvent = (e) => {
			e.preventDefault();
			const now = Date.now();

			// 检测双击手势
			if (touchStartPos && now - touchStartPos.time < 300) {
				touchCount++;
				if (touchCount === 2) {
					// 双击重置蛇身
					this.resetSnake();
					touchCount = 0;

					// 双击震动反馈
					if (this.options.vibrationEnabled && navigator.vibrate) {
						navigator.vibrate([50, 50, 50]); // 三次短震动
					}
					return;
				}
			} else {
				touchCount = 0;
			}

			isTouching = false;
			touchStartPos = null;
			touchMovePos = null;

			// 触摸结束时添加痕迹
			this.handleTouchEnd();
		};

		this.handleTouchCancel = (e) => {
			e.preventDefault();
			isTouching = false;
			touchStartPos = null;
			touchMovePos = null;
		};

		// 添加事件监听器
		this.canvas.addEventListener("touchstart", this.handleTouchStart, {
			passive: false,
		});
		this.canvas.addEventListener("touchmove", this.handleTouchMoveEvent, {
			passive: false,
		});
		this.canvas.addEventListener("touchend", this.handleTouchEndEvent, {
			passive: false,
		});
		this.canvas.addEventListener("touchcancel", this.handleTouchCancel, {
			passive: false,
		});
	}

	handleTouchMove(x, y) {
		const startX =
			Math.floor(this.gridOffset.x / this.options.squareSize) *
			this.options.squareSize;
		const startY =
			Math.floor(this.gridOffset.y / this.options.squareSize) *
			this.options.squareSize;

		const hoveredSquareX = Math.floor(
			(x + this.gridOffset.x - startX) / this.options.squareSize
		);
		const hoveredSquareY = Math.floor(
			(y + this.gridOffset.y - startY) / this.options.squareSize
		);

		if (
			this.hoveredSquare?.x !== hoveredSquareX ||
			this.hoveredSquare?.y !== hoveredSquareY
		) {
			// 将当前悬停的格子添加到蛇身
			if (this.hoveredSquare) {
				this.snakeBody.unshift({
					x: this.hoveredSquare.x,
					y: this.hoveredSquare.y,
				});

				// 如果没有吃到食物，移除蛇尾
				if (!this.shouldGrow && this.snakeBody.length > 0) {
					this.snakeBody.pop();
				}
				this.shouldGrow = false;
			}

			this.hoveredSquare = { x: hoveredSquareX, y: hoveredSquareY };
			// 当用户正在触摸时，设置较高的透明度
			this.targetOpacity = 0.8 * this.options.touchSensitivity;

			// 检查是否吃到食物
			if (
				this.specialBlock &&
				hoveredSquareX === this.specialBlock.x &&
				hoveredSquareY === this.specialBlock.y
			) {
				this.shouldGrow = true;
				this.createSpecialBlock();

				// 移动端吃到食物时的触觉反馈
				if (this.options.vibrationEnabled && navigator.vibrate) {
					navigator.vibrate(100);
				}
			}
		}
	}

	handleTouchEnd() {
		if (this.hoveredSquare) {
			// 将当前悬停的格子添加到蛇身
			this.snakeBody.unshift({
				x: this.hoveredSquare.x,
				y: this.hoveredSquare.y,
			});

			// 如果没有吃到食物，移除蛇尾
			if (!this.shouldGrow && this.snakeBody.length > 0) {
				this.snakeBody.pop();
			}
			this.shouldGrow = false;

			const startX =
				Math.floor(this.gridOffset.x / this.options.squareSize) *
				this.options.squareSize;
			const startY =
				Math.floor(this.gridOffset.y / this.options.squareSize) *
				this.options.squareSize;
			const key = `${this.hoveredSquare.x},${this.hoveredSquare.y}`;
			this.trailSquares.set(key, {
				x: this.hoveredSquare.x * this.options.squareSize + startX,
				y: this.hoveredSquare.y * this.options.squareSize + startY,
				opacity: 0.8,
			});
		}

		// 保持蛇身状态，不重置 hoveredSquare
		// 但降低透明度以显示触摸已结束
		if (this.hoveredSquare) {
			this.targetOpacity = 0.4; // 保持较低的透明度显示蛇头位置
		}
	}

	resetSnake() {
		// 重置蛇身
		this.snakeBody = [];
		this.hoveredSquare = null;
		this.targetOpacity = 0;

		// 清除所有痕迹
		this.trailSquares.clear();

		// 重新创建食物
		this.createSpecialBlock();

		// 添加重置的视觉反馈
		if (this.options.vibrationEnabled && navigator.vibrate) {
			navigator.vibrate(200); // 长震动表示重置
		}
	}

	handleMouseMove(event) {
		const rect = this.canvas.getBoundingClientRect();
		const mouseX = event.clientX - rect.left;
		const mouseY = event.clientY - rect.top;

		const startX =
			Math.floor(this.gridOffset.x / this.options.squareSize) *
			this.options.squareSize;
		const startY =
			Math.floor(this.gridOffset.y / this.options.squareSize) *
			this.options.squareSize;

		const hoveredSquareX = Math.floor(
			(mouseX + this.gridOffset.x - startX) / this.options.squareSize
		);
		const hoveredSquareY = Math.floor(
			(mouseY + this.gridOffset.y - startY) / this.options.squareSize
		);

		if (
			this.hoveredSquare?.x !== hoveredSquareX ||
			this.hoveredSquare?.y !== hoveredSquareY
		) {
			// 将当前悬停的格子添加到蛇身
			if (this.hoveredSquare) {
				this.snakeBody.unshift({
					x: this.hoveredSquare.x,
					y: this.hoveredSquare.y,
				});

				// 如果没有吃到食物，移除蛇尾
				if (!this.shouldGrow && this.snakeBody.length > 0) {
					this.snakeBody.pop();
				}
				this.shouldGrow = false;
			}

			this.hoveredSquare = { x: hoveredSquareX, y: hoveredSquareY };
			this.targetOpacity = 0.6;

			// 检查是否吃到食物
			if (
				this.specialBlock &&
				hoveredSquareX === this.specialBlock.x &&
				hoveredSquareY === this.specialBlock.y
			) {
				this.shouldGrow = true; // 标记蛇身需要增长
				this.createSpecialBlock(); // 吃到食物时立即生成新的食物
			}
		}
	}

	handleMouseLeave() {
		if (this.hoveredSquare) {
			const startX =
				Math.floor(this.gridOffset.x / this.options.squareSize) *
				this.options.squareSize;
			const startY =
				Math.floor(this.gridOffset.y / this.options.squareSize) *
				this.options.squareSize;
			const key = `${this.hoveredSquare.x},${this.hoveredSquare.y}`;
			this.trailSquares.set(key, {
				x: this.hoveredSquare.x * this.options.squareSize + startX,
				y: this.hoveredSquare.y * this.options.squareSize + startY,
				opacity: 0.6,
			});
		}
		this.hoveredSquare = null;
		this.targetOpacity = 0;
	}

	createSpecialBlock() {
		// 清除之前的定时器
		if (this.specialBlockTimer) {
			clearTimeout(this.specialBlockTimer);
		}

		// 获取设备像素比
		const dpr = window.devicePixelRatio || 1;

		// 随机生成特殊方块的位置
		const numSquaresX = Math.ceil(
			this.canvas.width / dpr / this.options.squareSize
		);
		const numSquaresY = Math.ceil(
			this.canvas.height / dpr / this.options.squareSize
		);

		// 确保食物不会生成在蛇身上和边缘
		let newX, newY;
		do {
			// 避开边缘，留出1格的空间
			newX = 1 + Math.floor(Math.random() * (numSquaresX - 2));
			newY = 1 + Math.floor(Math.random() * (numSquaresY - 2));
		} while (
			this.snakeBody.some((segment) => segment.x === newX && segment.y === newY)
		);

		this.specialBlock = {
			x: newX,
			y: newY,
			color: this.options.specialBlockColor,
			initialOffset: { ...this.gridOffset },
		};
	}

	drawGrid() {
		const dpr = window.devicePixelRatio || 1;

		// 清除前重置变换
		this.ctx.setTransform(1, 0, 0, 1, 0, 0);
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

		// 应用DPR比例
		this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

		const startX =
			Math.floor(this.gridOffset.x / this.options.squareSize) *
			this.options.squareSize;
		const startY =
			Math.floor(this.gridOffset.y / this.options.squareSize) *
			this.options.squareSize;

		// 增加边框线宽度，特别是在iOS设备上
		this.ctx.lineWidth = isPhone ? 1.0 : 0.5;

		// 为iOS设备优化渲染，避免边框闪烁
		if (isPhone) {
			this.ctx.translate(0.5, 0.5); // 在iOS上对齐像素
		}

		// 绘制蛇身
		this.snakeBody.forEach((segment, index) => {
			const squareX = Math.round(
				segment.x * this.options.squareSize +
					startX -
					(this.gridOffset.x % this.options.squareSize)
			);
			const squareY = Math.round(
				segment.y * this.options.squareSize +
					startY -
					(this.gridOffset.y % this.options.squareSize)
			);

			this.ctx.shadowColor = this.options.hoverShadowColor;
			this.ctx.shadowBlur = 15;
			this.ctx.shadowOffsetX = 0;
			this.ctx.shadowOffsetY = 0;

			// 计算蛇身颜色渐变
			if (index === 0) {
				// 蛇头使用特殊颜色
				this.ctx.fillStyle = this.options.snakeHeadColor;
			} else {
				// 计算渐变系数
				const gradientFactor = Math.pow(this.options.snakeColorDecay, index);

				// 解析头部和尾部颜色
				const headColorMatch = this.options.snakeHeadColor.match(
					/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([.\d]+))?\)/
				);
				const tailColorMatch = this.options.snakeTailColor.match(
					/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([.\d]+))?\)/
				);

				if (headColorMatch && tailColorMatch) {
					const headR = parseInt(headColorMatch[1]);
					const headG = parseInt(headColorMatch[2]);
					const headB = parseInt(headColorMatch[3]);
					const headA = headColorMatch[4] ? parseFloat(headColorMatch[4]) : 1;

					const tailR = parseInt(tailColorMatch[1]);
					const tailG = parseInt(tailColorMatch[2]);
					const tailB = parseInt(tailColorMatch[3]);
					const tailA = tailColorMatch[4] ? parseFloat(tailColorMatch[4]) : 1;

					// 计算中间渐变色
					const r = Math.round(headR + (tailR - headR) * (1 - gradientFactor));
					const g = Math.round(headG + (tailG - headG) * (1 - gradientFactor));
					const b = Math.round(headB + (tailB - headB) * (1 - gradientFactor));
					const a = headA + (tailA - headA) * (1 - gradientFactor);

					this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
				} else {
					// 回退到简单透明度渐变
					const opacity = Math.max(0.2, gradientFactor);
					this.ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
				}
			}

			this.ctx.fillRect(
				squareX,
				squareY,
				this.options.squareSize,
				this.options.squareSize
			);

			this.ctx.shadowColor = "transparent";
			this.ctx.shadowBlur = 0;
		});

		// 绘制当前悬停的格子和食物
		for (
			let x = startX;
			x < this.canvas.width + this.options.squareSize;
			x += this.options.squareSize
		) {
			for (
				let y = startY;
				y < this.canvas.height + this.options.squareSize;
				y += this.options.squareSize
			) {
				const squareX = Math.round(
					x - (this.gridOffset.x % this.options.squareSize)
				);
				const squareY = Math.round(
					y - (this.gridOffset.y % this.options.squareSize)
				);
				const gridX = Math.floor((x - startX) / this.options.squareSize);
				const gridY = Math.floor((y - startY) / this.options.squareSize);

				// 绘制食物
				if (
					this.specialBlock &&
					gridX === this.specialBlock.x &&
					gridY === this.specialBlock.y
				) {
					this.ctx.shadowColor = "rgba(255, 255, 255, 0.5)";
					this.ctx.shadowBlur = 20;
					this.ctx.fillStyle = this.specialBlock.color;
					this.ctx.fillRect(
						squareX,
						squareY,
						this.options.squareSize,
						this.options.squareSize
					);
					this.ctx.shadowColor = "transparent";
					this.ctx.shadowBlur = 0;
				}

				// 绘制当前悬停的格子（蛇头）
				if (
					this.hoveredSquare &&
					gridX === this.hoveredSquare.x &&
					gridY === this.hoveredSquare.y
				) {
					this.ctx.shadowColor = this.options.hoverShadowColor;
					this.ctx.shadowBlur = 15;
					this.ctx.shadowOffsetX = 0;
					this.ctx.shadowOffsetY = 0;

					const color = this.options.hoverFillColor.replace(
						"0.6",
						this.currentOpacity.toString()
					);
					this.ctx.fillStyle = color;
					this.ctx.fillRect(
						squareX,
						squareY,
						this.options.squareSize,
						this.options.squareSize
					);

					this.ctx.shadowColor = "transparent";
					this.ctx.shadowBlur = 0;
				}

				this.ctx.strokeStyle = this.options.borderColor;
				this.ctx.strokeRect(
					squareX,
					squareY,
					this.options.squareSize,
					this.options.squareSize
				);
			}
		}

		// 移动设备上重置坐标变换
		if (isPhone) {
			this.ctx.translate(-0.5, -0.5);
		}

		// 创建径向渐变来实现暗角效果
		const gradient = this.ctx.createRadialGradient(
			this.canvas.width / dpr / 2,
			this.canvas.height / dpr / 2,
			0,
			this.canvas.width / dpr / 2,
			this.canvas.height / dpr / 2,
			Math.sqrt(
				Math.pow(this.canvas.width / dpr, 2) +
					Math.pow(this.canvas.height / dpr, 2)
			) / 2
		);
		gradient.addColorStop(0, "rgba(6, 6, 6, 0)");
		gradient.addColorStop(1, "#060606");

		this.ctx.fillStyle = gradient;
		this.ctx.fillRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);
	}

	updateAnimation(timestamp) {
		if (!this.lastTimestamp) {
			this.lastTimestamp = timestamp;
		}

		const deltaTime = timestamp - this.lastTimestamp;
		this.lastTimestamp = timestamp;

		// 更新透明度
		if (this.currentOpacity !== this.targetOpacity) {
			const progress = Math.min(deltaTime / this.options.transitionDuration, 1);
			this.currentOpacity =
				this.currentOpacity +
				(this.targetOpacity - this.currentOpacity) * progress;
		}

		// 更新痕迹格子的透明度
		for (const [key, square] of this.trailSquares) {
			square.opacity -= deltaTime / this.options.trailDuration;
			if (square.opacity <= 0) {
				this.trailSquares.delete(key);
			}
		}

		// 获取设备像素比
		const dpr = window.devicePixelRatio || 1;

		// 更新网格位置，为移动设备降低速度以减少闪烁
		const effectiveSpeed = Math.max(
			isPhone ? this.options.speed * 0.8 : this.options.speed,
			0
		);

		// 确保移动位置为整数值来避免子像素渲染导致的闪烁
		const moveAmount = isPhone
			? Math.round(effectiveSpeed * 100) / 100
			: effectiveSpeed;

		switch (this.options.direction) {
			case "right":
				this.gridOffset.x =
					(this.gridOffset.x - moveAmount + this.options.squareSize) %
					this.options.squareSize;
				break;
			case "left":
				this.gridOffset.x =
					(this.gridOffset.x + moveAmount + this.options.squareSize) %
					this.options.squareSize;
				break;
			case "up":
				this.gridOffset.y =
					(this.gridOffset.y + moveAmount + this.options.squareSize) %
					this.options.squareSize;
				break;
			case "down":
				this.gridOffset.y =
					(this.gridOffset.y - moveAmount + this.options.squareSize) %
					this.options.squareSize;
				break;
			case "diagonal":
				this.gridOffset.x =
					(this.gridOffset.x - moveAmount + this.options.squareSize) %
					this.options.squareSize;
				this.gridOffset.y =
					(this.gridOffset.y - moveAmount + this.options.squareSize) %
					this.options.squareSize;
				break;
		}

		// 检查食物是否移出屏幕
		if (this.specialBlock) {
			const startX =
				Math.floor(this.gridOffset.x / this.options.squareSize) *
				this.options.squareSize;
			const startY =
				Math.floor(this.gridOffset.y / this.options.squareSize) *
				this.options.squareSize;
			const foodX = Math.round(
				this.specialBlock.x * this.options.squareSize +
					startX -
					(this.gridOffset.x % this.options.squareSize)
			);
			const foodY = Math.round(
				this.specialBlock.y * this.options.squareSize +
					startY -
					(this.gridOffset.y % this.options.squareSize)
			);

			// 调整适用于设备像素比的边界检查
			if (
				foodX < -this.options.squareSize ||
				foodX > this.canvas.width / dpr ||
				foodY < -this.options.squareSize ||
				foodY > this.canvas.height / dpr
			) {
				// 食物移出屏幕时生成新的食物
				this.createSpecialBlock();
			}
		}

		this.drawGrid();
		this.animationFrame = requestAnimationFrame((timestamp) =>
			this.updateAnimation(timestamp)
		);
	}

	animate() {
		this.animationFrame = requestAnimationFrame((timestamp) =>
			this.updateAnimation(timestamp)
		);
	}

	handleVisibilityChange() {
		if (document[hiddenProperty]) {
			// 页面不可见时暂停动画
			if (this.animationFrame) {
				cancelAnimationFrame(this.animationFrame);
				this.animationFrame = null;
			}
		} else {
			// 页面重新可见时恢复动画
			if (!this.animationFrame) {
				this.lastTimestamp = 0; // 重置时间戳以防止大幅度更新
				this.animate();
			}
		}
	}

	destroy() {
		if (this.animationFrame) {
			cancelAnimationFrame(this.animationFrame);
		}
		window.removeEventListener("resize", () => this.resizeCanvas());
		this.canvas.removeEventListener("mousemove", (e) =>
			this.handleMouseMove(e)
		);
		this.canvas.removeEventListener("mouseleave", () =>
			this.handleMouseLeave()
		);

		// 移除触摸事件监听器
		if (isPhone && this.handleTouchStart) {
			this.canvas.removeEventListener("touchstart", this.handleTouchStart);
			this.canvas.removeEventListener("touchmove", this.handleTouchMoveEvent);
			this.canvas.removeEventListener("touchend", this.handleTouchEndEvent);
			this.canvas.removeEventListener("touchcancel", this.handleTouchCancel);
		}

		document.removeEventListener(
			visibilityChangeEvent,
			this.handleVisibilityChange.bind(this)
		);

		// 移除方向变化监听
		if (isPhone && window.orientation !== undefined) {
			window.removeEventListener("orientationchange", () => {});
		}
	}
}

window.hiddenProperty =
	"hidden" in document
		? "hidden"
		: "webkitHidden" in document
		? "webkitHidden"
		: "mozHidden" in document
		? "mozHidden"
		: null;

window.DIRECTIONS = {
	UP: "UP",
	DOWN: "DOWN",
	LEFT: "LEFT",
	RIGHT: "RIGHT",
	UNDIRECTED: "UNDIRECTED",
};
window.isPhone =
	/Mobile|Android|iOS|iPhone|iPad|iPod|Windows Phone|KFAPWI/i.test(
		navigator.userAgent
	);

function getMoveDirection(startx, starty, endx, endy) {
	if (!isPhone) {
		return;
	}

	const angx = endx - startx;
	const angy = endy - starty;

	if (Math.abs(angx) < 2 && Math.abs(angy) < 2) {
		return DIRECTIONS.UNDIRECTED;
	}

	const getAngle = (angx, angy) => (Math.atan2(angy, angx) * 180) / Math.PI;

	const angle = getAngle(angx, angy);
	if (angle >= -135 && angle <= -45) {
		return DIRECTIONS.UP;
	} else if (angle > 45 && angle < 135) {
		return DIRECTIONS.DOWN;
	} else if (
		(angle >= 135 && angle <= 180) ||
		(angle >= -180 && angle < -135)
	) {
		return DIRECTIONS.LEFT;
	} else if (angle >= -45 && angle <= 45) {
		return DIRECTIONS.RIGHT;
	}

	return DIRECTIONS.UNDIRECTED;
}

function loadIntro() {
	if (document[hiddenProperty] || loadIntro.loaded) {
		return;
	}

	setTimeout(() => {
		$(".wrap").classList.add("in");
		setTimeout(() => {
			$(".content-subtitle").innerHTML = `<span>${[...subtitle].join(
				"</span><span>"
			)}</span>`;
		}, 270);
	}, 0);
	loadIntro.loaded = true;
}

function switchPage() {
	if (switchPage.switched) {
		return;
	}
	const DOM = {
		intro: $(".content-intro"),
		path: $(".shape-wrap path"),
		shape: $("svg.shape"),
	};
	DOM.shape.style.transformOrigin = "50% 0%";

	anime({
		targets: DOM.intro,
		duration: 1100,
		easing: "easeInOutSine",
		translateY: "-200vh",
	});

	anime({
		targets: DOM.shape,
		scaleY: [
			{
				value: [0.8, 1.8],
				duration: 550,
				easing: "easeInQuad",
			},
			{
				value: 1,
				duration: 550,
				easing: "easeOutQuad",
			},
		],
	});
	anime({
		targets: DOM.path,
		duration: 1100,
		easing: "easeOutQuad",
		d: DOM.path.getAttribute("pathdata:id"),
		complete: function (anim) {
			if (canvas) {
				cancelAnimationFrame(animationID);
				canvas.parentElement.removeChild(canvas);
				canvas = null;
			}
		},
	});

	switchPage.switched = true;
}

function loadMain() {
	if (loadMain.loaded) {
		return;
	}
	setTimeout(() => {
		const workspacePanel = document.querySelector(".workspace-panel");
		if (workspacePanel) {
			workspacePanel.classList.add("in");
		}
		setTimeout(() => {
			const canvas = document.getElementById("gridCanvas");
			if (canvas) {
				const gridAnimation = new GridAnimation(canvas, {
					direction: "diagonal",
					speed: isPhone ? 0.03 : 0.05,
					borderColor: isPhone
						? "rgba(255, 255, 255, 0.2)"
						: "rgba(255, 255, 255, 0.1)",
					squareSize: isPhone ? 50 : 40,
					hoverFillColor: "rgba(255, 255, 255, 0.8)",
					hoverShadowColor: "rgba(255, 255, 255, 0.8)",
					transitionDuration: isPhone ? 150 : 200, // 移动端更快的过渡
					trailDuration: isPhone ? 2000 : 1500, // 移动端更长的痕迹
					specialBlockColor: "rgba(100, 255, 152, 0.8)",
					specialHoverColor: "rgba(29, 202, 29, 0.8)",
					// 蛇身颜色渐变配置
					snakeHeadColor: "rgba(255, 255, 255, 0.95)",
					snakeTailColor: "rgba(218, 231, 255, 0.25)",
					snakeColorDecay: 0.85, // 颜色衰减系数
					// 移动端特殊配置
					touchSensitivity: isPhone ? 1.2 : 1.0, // 触摸灵敏度
					vibrationEnabled: isPhone, // 是否启用震动反馈
				});
				gridAnimation.init();
			}
		}, 1100);
	}, 400);
	loadMain.loaded = true;
}

function loadAll() {
	if (loadAll.loaded) {
		return;
	}
	switchPage();
	loadMain();
	loadAll.loaded = true;
}

window.visibilityChangeEvent = hiddenProperty.replace(
	/hidden/i,
	"visibilitychange"
);
window.addEventListener(visibilityChangeEvent, loadIntro);
window.addEventListener("DOMContentLoaded", loadIntro);

const enterEl = $(".enter");
enterEl.addEventListener("click", loadAll);
enterEl.addEventListener("touchenter", loadAll);

function handleScrollEvent(e) {
	const deltaY = e.deltaY || e.wheelDelta * -1 || e.detail;
	if (deltaY > 0) {
		loadAll();
	}
}

document.body.addEventListener("wheel", handleScrollEvent, { passive: true });
document.body.addEventListener("mousewheel", handleScrollEvent, {
	passive: true,
});
document.body.addEventListener("DOMMouseScroll", handleScrollEvent, {
	passive: true,
}); // Firefox兼容
$(".arrow").addEventListener("mouseenter", loadAll);

if (isPhone) {
	document.addEventListener(
		"touchstart",
		function (e) {
			window.startx = e.touches[0].pageX;
			window.starty = e.touches[0].pageY;
		},
		{ passive: true }
	);
	document.addEventListener(
		"touchend",
		function (e) {
			let endx, endy;
			endx = e.changedTouches[0].pageX;
			endy = e.changedTouches[0].pageY;

			const direction = getMoveDirection(startx, starty, endx, endy);
			if (direction !== DIRECTIONS.UP) {
				return;
			}
			loadAll();
		},
		{ passive: true }
	);
}

function bindContentFilters() {
	const noteSearch = document.getElementById("noteSearch");
	const noteCards = Array.prototype.slice.call(
		document.querySelectorAll("[data-note-card]")
	);
	const noteEmpty = document.getElementById("noteEmptyState");
	const filterButtons = Array.prototype.slice.call(
		document.querySelectorAll("[data-filter-value]")
	);
	const noteCountLabel = document.querySelector("[data-note-count]");
	let activeFilter = "";

	if (!noteSearch || !noteCards.length) {
		return;
	}

	function getHaystack(card) {
		return [
			card.dataset.title,
			card.dataset.tags,
			card.dataset.category,
			card.dataset.excerpt,
		]
			.join(" ")
			.toLowerCase();
	}

	function getCardTags(card) {
		return String(card.dataset.tags || "")
			.split(/\s*\|\s*|\s*\/\s*|\s*,\s*/)
			.map((tag) => tag.trim().toLowerCase())
			.filter(Boolean);
	}

	function matches(card, query, filter) {
		const haystack = getHaystack(card);
		const matchesQuery = !query || haystack.indexOf(query) !== -1;
		const normalizedFilter = String(filter || "").toLowerCase();
		const category = String(card.dataset.category || "").toLowerCase();
		const tags = getCardTags(card);
		const matchesFilter =
			!normalizedFilter ||
			category === normalizedFilter ||
			tags.indexOf(normalizedFilter) !== -1;
		return matchesQuery && matchesFilter;
	}

	function updateFilterButtons() {
		filterButtons.forEach((button) => {
			const value = button.dataset.filterValue || "";
			button.classList.toggle("is-active", value === activeFilter);
		});
	}

	function applyFilter() {
		const query = noteSearch.value.trim().toLowerCase();
		let visible = 0;
		noteCards.forEach((card) => {
			const matched = matches(card, query, activeFilter);
			card.hidden = !matched;
			card.classList.toggle("is-hidden", !matched);
			if (matched) {
				visible += 1;
			}
		});
		if (noteEmpty) {
			noteEmpty.hidden = visible !== 0;
		}
		if (noteCountLabel) {
			const total = noteCountLabel.dataset.total || String(noteCards.length);
			noteCountLabel.textContent = `Showing ${visible} of ${total} posts`;
		}
		updateFilterButtons();
	}

	function setActiveFilter(value) {
		activeFilter = value || "";
		loadAll();
		setWorkspaceView("#notes");
		window.history.replaceState(null, "", "#notes");
		scrollMainToHash("#notes");
		applyFilter();
	}

	noteSearch.addEventListener("input", () => {
		if (noteSearch.value.trim()) {
			loadAll();
			setWorkspaceView("#notes");
			window.history.replaceState(null, "", "#notes");
		}
		applyFilter();
	});
	filterButtons.forEach((button) => {
		button.addEventListener("click", () => {
			const value = button.dataset.filterValue || "";
			setActiveFilter(value === activeFilter ? "" : value);
		});
	});
	applyFilter();
}

	function scrollMainToHash(hash) {
		if (!hash || hash === "#") {
			return;
		}
	const target = document.querySelector(hash);
	if (!target) {
		return;
	}
		target.scrollIntoView({ behavior: "smooth", block: "start" });
	}

	function clearAboutIntro(main) {
		if (clearAboutIntro.startTimer) {
			window.clearTimeout(clearAboutIntro.startTimer);
			clearAboutIntro.startTimer = null;
		}
		if (clearAboutIntro.timer) {
			window.clearTimeout(clearAboutIntro.timer);
			clearAboutIntro.timer = null;
		}
		main.classList.remove("about-intro-playing");
	}

	function playAboutIntro(main, delay = 0) {
		clearAboutIntro(main);
		const startIntro = () => {
			clearAboutIntro.startTimer = null;
			main.classList.add("about-intro-playing");
			clearAboutIntro.timer = window.setTimeout(() => {
				main.classList.remove("about-intro-playing");
				clearAboutIntro.timer = null;
			}, 2700);
		};
		if (delay > 0) {
			clearAboutIntro.startTimer = window.setTimeout(startIntro, delay);
			return;
		}
		window.requestAnimationFrame(startIntro);
	}

	function setWorkspaceView(hash, options = {}) {
		const main = document.querySelector(".content-main");
		if (!main) {
			return;
		}
		const isMemoView = hash === "#memos";
		const isAcademicView = hash === "#papers";
		const isAboutView = hash === "#about";
		main.classList.toggle("view-memos", isMemoView);
		main.classList.toggle("view-academic", isAcademicView);
		main.classList.toggle("view-about", isAboutView);
		if (isAboutView) {
			playAboutIntro(main, options.introDelay || 0);
		} else {
			clearAboutIntro(main);
		}
		Array.prototype.slice
			.call(document.querySelectorAll(".topbar-nav a"))
			.forEach((link) => {
				link.classList.toggle("is-active", link.getAttribute("href") === hash);
			});
}

function bindLocalAnchors() {
	Array.prototype.slice
		.call(document.querySelectorAll('a[href^="#"]'))
		.forEach((link) => {
			link.addEventListener("click", (event) => {
				const hash = link.getAttribute("href");
				if (!hash || hash === "#") {
					return;
				}
				event.preventDefault();
				const wasLoaded = loadAll.loaded;
				loadAll();
				setWorkspaceView(hash, {
					introDelay: hash === "#about" && !wasLoaded ? 1150 : 0,
				});
				window.history.replaceState(null, "", hash);
				setTimeout(() => scrollMainToHash(hash), 500);
			});
		});
}

	function revealInitialHash() {
		if (!window.location.hash || window.location.hash === "#") {
			setWorkspaceView("#about");
			return;
		}
		const hash = window.location.hash;
		const wasLoaded = loadAll.loaded;
		loadAll();
		setWorkspaceView(hash, {
			introDelay: hash === "#about" && !wasLoaded ? 1150 : 0,
		});
		setTimeout(() => scrollMainToHash(hash), 1300);
	}

	function bindHashNavigation() {
		window.addEventListener("hashchange", () => {
			if (!window.location.hash || window.location.hash === "#") {
				setWorkspaceView("#about");
				return;
			}
			const hash = window.location.hash;
			const wasLoaded = loadAll.loaded;
			loadAll();
			setWorkspaceView(hash, {
				introDelay: hash === "#about" && !wasLoaded ? 1150 : 0,
			});
			setTimeout(() => scrollMainToHash(hash), 120);
		});
	}

function bindThemeToggle() {
	const main = document.querySelector(".content-main");
	const button = document.querySelector("[data-theme-toggle]");
	const icon = document.querySelector("[data-theme-icon]");
	if (!main || !button || !icon) {
		return;
	}

	function applyTheme(theme) {
		const isLight = theme === "light";
		main.classList.toggle("theme-light", isLight);
		icon.textContent = isLight ? "☾" : "☀";
		button.setAttribute(
			"aria-label",
			isLight ? "Switch to dark mode" : "Switch to light mode"
		);
	}

	const savedTheme = window.localStorage.getItem("junle-homepage-theme") || "dark";
	applyTheme(savedTheme);

	button.addEventListener("click", () => {
		const nextTheme = main.classList.contains("theme-light") ? "dark" : "light";
		window.localStorage.setItem("junle-homepage-theme", nextTheme);
		applyTheme(nextTheme);
	});
}

function bindGlassTopbar() {
	const main = document.querySelector(".content-main");
	const topbar = document.querySelector(".workspace-topbar");
	if (!main || !topbar) {
		return;
	}

	function updateGlassState() {
		main.classList.toggle("is-scrolled", main.scrollTop > 18);
	}

	main.addEventListener("scroll", updateGlassState, { passive: true });
	updateGlassState();
}

	function bindNoteViewToggle() {
		const feed = document.querySelector("[data-note-feed]");
		const buttons = Array.prototype.slice.call(
			document.querySelectorAll("[data-note-view]")
		);
	if (!feed || !buttons.length) {
		return;
	}

	function applyView(view) {
		const nextView = view === "image" ? "image" : "site";
		feed.classList.toggle("note-view-image", nextView === "image");
		feed.classList.toggle("note-view-site", nextView === "site");
		buttons.forEach((button) => {
			button.classList.toggle("is-active", button.dataset.noteView === nextView);
		});
		window.localStorage.setItem("junle-homepage-note-view", nextView);
	}

	buttons.forEach((button) => {
		button.addEventListener("click", () => applyView(button.dataset.noteView));
	});
		applyView(window.localStorage.getItem("junle-homepage-note-view") || "site");
	}

	function bindExternalDropdown() {
		const dropdown = document.querySelector("[data-topbar-dropdown]");
		const button = document.querySelector("[data-dropdown-toggle]");
		if (!dropdown || !button) {
			return;
		}

		function setOpen(open) {
			dropdown.classList.toggle("is-open", open);
			button.setAttribute("aria-expanded", open ? "true" : "false");
		}

		button.addEventListener("click", (event) => {
			event.stopPropagation();
			setOpen(!dropdown.classList.contains("is-open"));
		});

		document.addEventListener("click", (event) => {
			if (!dropdown.contains(event.target)) {
				setOpen(false);
			}
		});

		document.addEventListener("keydown", (event) => {
			if (event.key === "Escape") {
				setOpen(false);
			}
		});
	}

	function bindMemoManager() {
		const timeline = document.querySelector("[data-memo-timeline]");
		const form = document.querySelector("[data-memo-form]");
		const ownerButton = document.querySelector("[data-memo-owner]");
		const ownerInput = document.querySelector("[data-memo-owner-key]");
		const status = document.querySelector("[data-memo-status]");
		const datePreview = document.querySelector("[data-memo-date-preview]");
		if (!timeline || !form || !ownerButton || !ownerInput || !status) {
			return;
		}

		const STORAGE_KEY = "junle-homepage-memos";
		const OWNER_STORAGE_KEY = "junle-homepage-owner-mode-v2";
		const OWNER_KEY_HASH = "7e6918fc06fb5179e913a7e058e762d89ccf981b5ba9660f53a026e747e9092a";
		const seedMemos = Array.prototype.slice
			.call(document.querySelectorAll("[data-memo-card]"))
			.map((entry) => ({
				id: entry.dataset.id,
				title: entry.dataset.title || "Memo",
				content: entry.dataset.content || "",
				category: entry.dataset.category || "general",
				date: entry.dataset.date || "",
				priority: entry.dataset.priority || "normal",
				source: entry.dataset.source || "imported",
			}));
		let ownerMode = window.localStorage.getItem(OWNER_STORAGE_KEY) === "true";

		function readState() {
			try {
				return JSON.parse(window.localStorage.getItem(STORAGE_KEY)) || {};
			} catch (error) {
				return {};
			}
		}

			function writeState(state) {
				window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
			}

			function bufferToHex(buffer) {
				return Array.prototype.map
					.call(new Uint8Array(buffer), (value) => value.toString(16).padStart(2, "0"))
					.join("");
			}

			function checkOwnerKey(key) {
				if (!window.crypto || !window.crypto.subtle || !window.TextEncoder) {
					return Promise.reject(new Error("Crypto unavailable"));
				}
				return window.crypto.subtle
					.digest("SHA-256", new TextEncoder().encode(key))
					.then((buffer) => bufferToHex(buffer) === OWNER_KEY_HASH);
			}

		function formatDate(date) {
			const pad = (value) => String(value).padStart(2, "0");
			return [
				date.getFullYear(),
				pad(date.getMonth() + 1),
				pad(date.getDate()),
			].join("-") + " " + [pad(date.getHours()), pad(date.getMinutes())].join(":");
		}

		function getVisibleMemos() {
			const state = readState();
			const deletedIds = state.deletedSeedIds || [];
			const localMemos = state.localMemos || [];
			return seedMemos
				.filter((memo) => deletedIds.indexOf(memo.id) === -1)
				.concat(localMemos)
				.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
		}

		function createMemoEntry(memo) {
			const article = document.createElement("article");
			article.className = "memo-entry";
			article.dataset.memoCard = "";
			article.dataset.id = memo.id;

			const dot = document.createElement("div");
			dot.className = "memo-entry-dot";
			dot.setAttribute("aria-hidden", "true");

			const body = document.createElement("div");
			body.className = "memo-entry-body";

			const meta = document.createElement("div");
			meta.className = "memo-entry-meta";
			[memo.date || "No date", memo.category || "general", memo.source || "local"].forEach((value) => {
				const span = document.createElement("span");
				span.textContent = value;
				meta.appendChild(span);
			});

			const title = document.createElement("h3");
			title.textContent = memo.title || "Memo";

			const content = document.createElement("p");
			content.textContent = memo.content || "Empty memo body.";
			if (!memo.content) {
				content.className = "muted";
			}

			const actions = document.createElement("div");
			actions.className = "memo-entry-actions";
			const priority = document.createElement("span");
			priority.textContent = memo.priority || "normal";
			actions.appendChild(priority);

			if (/^https?:\/\//.test(memo.content || "")) {
				const link = document.createElement("a");
				link.href = memo.content;
				link.target = "_blank";
				link.rel = "noopener noreferrer";
				link.textContent = "Open link";
				actions.appendChild(link);
			}

			const deleteButton = document.createElement("button");
			deleteButton.type = "button";
			deleteButton.className = "memo-delete";
			deleteButton.dataset.memoDelete = "";
			deleteButton.hidden = !ownerMode;
			deleteButton.textContent = "Delete";
			actions.appendChild(deleteButton);

			body.appendChild(meta);
			body.appendChild(title);
			body.appendChild(content);
			body.appendChild(actions);
			article.appendChild(dot);
			article.appendChild(body);
			return article;
		}

		function renderMemos() {
			timeline.innerHTML = "";
			getVisibleMemos().forEach((memo) => {
				timeline.appendChild(createMemoEntry(memo));
			});
			form.hidden = !ownerMode;
			status.textContent = ownerMode ? "Owner unlocked" : "Locked";
			ownerButton.textContent = ownerMode ? "Lock" : "Owner";
			ownerInput.hidden = ownerMode;
			Array.prototype.slice
				.call(document.querySelectorAll("[data-memo-delete]"))
				.forEach((button) => {
					button.hidden = !ownerMode;
				});
			if (datePreview) {
				datePreview.textContent = formatDate(new Date());
			}
		}

			ownerButton.addEventListener("click", () => {
				if (ownerMode) {
					ownerMode = false;
					window.localStorage.removeItem(OWNER_STORAGE_KEY);
					renderMemos();
					return;
				}
				const key = ownerInput.value.trim();
				ownerButton.disabled = true;
				checkOwnerKey(key)
					.then((matches) => {
						if (matches) {
							ownerMode = true;
							window.localStorage.setItem(OWNER_STORAGE_KEY, "true");
							ownerInput.value = "";
							renderMemos();
							return;
						}
						status.textContent = "Owner key needed";
						ownerInput.focus();
					})
					.catch(() => {
						status.textContent = "Owner unlock requires HTTPS or localhost";
						ownerInput.focus();
					})
					.finally(() => {
						ownerButton.disabled = false;
					});
			});

		form.addEventListener("submit", (event) => {
			event.preventDefault();
			if (!ownerMode) {
				return;
			}
			const titleInput = form.elements.title;
			const contentInput = form.elements.content;
			const now = new Date();
			const date = formatDate(now);
			const content = contentInput.value.trim();
			if (!content && !titleInput.value.trim()) {
				return;
			}
			const state = readState();
			const localMemos = state.localMemos || [];
			localMemos.push({
				id: "local-" + now.getTime(),
				title: titleInput.value.trim() || "Memo " + date.slice(0, 10),
				content,
				category: "local",
				date,
				priority: "normal",
				source: "local",
			});
			writeState({
				deletedSeedIds: state.deletedSeedIds || [],
				localMemos,
			});
			form.reset();
			renderMemos();
		});

		timeline.addEventListener("click", (event) => {
			const deleteButton = event.target.closest("[data-memo-delete]");
			if (!deleteButton || !ownerMode) {
				return;
			}
			const entry = deleteButton.closest("[data-memo-card]");
			const id = entry ? entry.dataset.id : "";
			if (!id) {
				return;
			}
			const state = readState();
			const deletedSeedIds = state.deletedSeedIds || [];
			const localMemos = state.localMemos || [];
			if (id.indexOf("seed-") === 0 && deletedSeedIds.indexOf(id) === -1) {
				deletedSeedIds.push(id);
			}
			writeState({
				deletedSeedIds,
				localMemos: localMemos.filter((memo) => memo.id !== id),
			});
			renderMemos();
		});

		renderMemos();
	}

	function bindDailyPapers() {
		const list = document.querySelector("[data-daily-paper-list]");
		const fullList = document.querySelector("[data-daily-paper-full]");
		const empty = document.querySelector("[data-daily-paper-empty]");
		const fullEmpty = document.querySelector("[data-daily-paper-full-empty]");
		const updated = document.querySelector("[data-daily-paper-updated]");
		const academicUpdated = document.querySelector("[data-academic-updated]");
		const dateInput = document.querySelector("[data-paper-date]");
		const dateClear = document.querySelector("[data-paper-date-clear]");
		const dateList = document.querySelector("[data-paper-date-list]");
		const sortButtons = Array.prototype.slice.call(document.querySelectorAll("[data-paper-sort]"));
		const digestBox = document.querySelector("[data-daily-digest]");
		const digestCopy = document.querySelector("[data-digest-copy]");
		const digestStatus = document.querySelector("[data-digest-status]");
		if (!list && !fullList) {
			return;
		}

		const SORT_STORAGE_KEY = "junle-homepage-daily-paper-sort";
		let allItems = [];
		let selectedDate = "";
		let sortOrder = window.localStorage.getItem(SORT_STORAGE_KEY) || "desc";
		let currentDigestText = "";

		function setEmpty(node, message, hidden) {
			if (node) {
				node.hidden = hidden;
				node.textContent = message;
			}
		}

		function setUpdatedLabel(data) {
			const label = data.digest && data.digest.title
				? data.digest.title
				: data.updated_at
					? "Updated " + data.updated_at
					: "arXiv agent feed";
			if (updated) {
				updated.textContent = label;
			}
			if (academicUpdated) {
				academicUpdated.textContent = label;
			}
		}

		function getPaperKey(paper) {
			return paper.id || paper.url || paper.title || "paper";
		}

		function getPaperDate(paper) {
			return String(paper.published || paper.updated || "").slice(0, 10);
		}

		function getRepoUrl(paper) {
			const brief = paper.brief || {};
			const explicit = paper.repo_url || brief.repo_url || paper.repository_url || paper.code_url || paper.github_url;
			if (explicit) {
				return explicit;
			}
			const source = [paper.summary || "", paper.url || "", paper.title || ""].join(" ");
			const match = source.match(/https?:\/\/(?:www\.)?(?:github\.com|gitlab\.com|huggingface\.co)\/[^\s),]+/i);
			return match ? match[0] : "";
		}

		function getAffiliations(paper) {
			const brief = paper.brief || {};
			const affiliations = brief.affiliations || paper.affiliations || paper.institutions || paper.organizations;
			if (Array.isArray(affiliations) && affiliations.length) {
				return affiliations.join("; ");
			}
			if (typeof affiliations === "string" && affiliations.trim()) {
				return affiliations;
			}
			return "arXiv metadata 未提供；需要打开 arXiv 页面或正文查看作者单位。";
		}

		function firstMatchingSentence(text, pattern) {
			const sentences = String(text || "")
				.replace(/\s+/g, " ")
				.split(/(?<=[.!?])\s+/)
				.filter(Boolean);
			return sentences.find((sentence) => pattern.test(sentence)) || "";
		}

		function getPaperInterpretation(paper) {
			const brief = paper.brief || {};
			if (brief.motivation || brief.method || brief.experiments || brief.research_help) {
				return {
					"论文动机": brief.motivation || "自动化还没有写入动机解读。",
					"方法": brief.method || "自动化还没有写入方法解读。",
					"实验结果": brief.experiments || "自动化还没有写入实验结果解读。",
					"对 research 的帮助": brief.research_help || "自动化还没有写入 research 帮助判断。",
				};
			}
			const title = paper.title || "Untitled paper";
			const summary = paper.summary || "";
			const source = `${title} ${summary}`.toLowerCase();
			const methodSentence = firstMatchingSentence(
				summary,
				/\b(propose|introduce|present|framework|method|model|algorithm|tree search|reinforcement|optimization|training|agent)\b/i
			);
			const experimentSentence = firstMatchingSentence(
				summary,
				/\b(experiment|benchmark|result|outperform|achieve|demonstrate|evaluate|success|accuracy|score|validated)\b/i
			);
			const motivation = /sparse|long[- ]?horizon|complex|challeng|struggle/.test(source)
				? "动机是解决长程 agent 任务中的稀疏反馈、复杂交互或规划可靠性问题。"
				: "动机是把当前方法推进到更接近真实 agent 工作流的任务设定。";
			const method = methodSentence
				? methodSentence
				: "方法需要进一步读正文确认；从标题和摘要看，核心是围绕 agent 训练、规划、工具使用或评测构建新的框架。";
			const experiments = experimentSentence
				? experimentSentence
				: "摘要没有给出明确实验数字；需要打开论文正文查看 benchmark、baseline 和 ablation。";
			let researchHelp = "可作为 Daily Paper 候选，优先检查任务定义、评测协议、失败案例和可复现资源。";
			if (/agentic|reinforcement|rl\b|reward|grpo/.test(source)) {
				researchHelp = "对 agentic RL 研究有帮助：重点看奖励设计、trajectory 采样、环境反馈和 policy optimization 的接口。";
			}
			if (/multi[- ]?turn|dialog|interactive|interaction/.test(source)) {
				researchHelp = "对多轮 agent 研究有帮助：重点看状态保持、用户偏好延续、澄清机制和跨轮评测。";
			}
			if (/long[- ]?horizon|planning|planner|plan/.test(source)) {
				researchHelp = "对 long-horizon planning 有帮助：重点看任务分解、搜索/回溯、失败恢复和子目标评估。";
			}
			if (/memory|stateful|personalized|preference/.test(source)) {
				researchHelp = "对 agent memory 有帮助：重点看记忆写入、检索、更新和个性化状态如何进入规划过程。";
			}
			return {
				"论文动机": motivation,
				"方法": method,
				"实验结果": experiments,
				"对 research 的帮助": researchHelp,
			};
		}

		function getPaperTags(paper) {
			const source = [
				paper.title || "",
				paper.summary || "",
				(paper.categories || []).join(" "),
			].join(" ").toLowerCase();
			const tags = [];
			if (/agentic|agent/.test(source)) {
				tags.push("agent");
			}
			if (/reinforcement|rl\b/.test(source)) {
				tags.push("agentic rl");
			}
			if (/multi[- ]?turn|dialog|interaction/.test(source)) {
				tags.push("multi-turn");
			}
			if (/long[- ]?horizon|planning|planner|plan/.test(source)) {
				tags.push("long-horizon planning");
			}
			if (/memory|stateful|preference/.test(source)) {
				tags.push("agent memory");
			}
			return (paper.categories || []).slice(0, 3).concat(tags).slice(0, 6);
		}

		function getContribution(paper) {
			if (paper.brief && paper.brief.contribution) {
				return paper.brief.contribution;
			}
			const source = [paper.title || "", paper.summary || ""].join(" ").toLowerCase();
			const contributions = [];
			if (/reinforcement|rl\b|grpo|reward/.test(source)) {
				contributions.push("围绕 agentic RL 训练，关注奖励信号、环境交互和策略改进");
			}
			if (/long[- ]?horizon|multi[- ]?step|planning|planner|plan/.test(source)) {
				contributions.push("面向长程任务规划，适合检查任务分解、失败恢复和跨步骤一致性");
			}
			if (/multi[- ]?turn|dialog|interactive|interaction/.test(source)) {
				contributions.push("涉及多轮交互或动态环境，需要重点看状态保持和交互协议");
			}
			if (/memory|stateful|personalized|preference/.test(source)) {
				contributions.push("与 agent memory、个性化状态或偏好延续相关");
			}
			if (/benchmark|dataset|evaluation|eval/.test(source)) {
				contributions.push("提供或使用评测基准，可用于对比 planning agent 的可靠性");
			}
			if (/skill|tool/.test(source)) {
				contributions.push("关注工具使用或技能构建，可能适合纳入 reusable agent workflow");
			}
			if (!contributions.length) {
				contributions.push("作为候选论文，先检查问题设定、方法模块、实验任务和是否可复现");
			}
			return contributions.join("；") + "。";
		}

		function getRecommendation(paper) {
			const explicit = paper.recommendation || (paper.brief && paper.brief.recommendation);
			if (explicit) {
				const explicitLevel = explicit.level || explicit.value_level || (
					explicit.score >= 78 ? "高" : explicit.score >= 58 ? "中" : "低"
				);
				return {
					score: explicit.score || 0,
					level: explicitLevel,
					label: explicit.label || "待评估",
					waterRisk: explicit.water_risk || explicit.waterRisk || "未知",
					judgement: explicit.value_judgement || explicit.judgement || "自动化还没有写入价值判断。",
					reason: explicit.reason || "",
				};
			}
			const source = [paper.title || "", paper.summary || ""].join(" ").toLowerCase();
			let score = 36;
			if (/agentic|reinforcement|rl\b|grpo|ppo|reward/.test(source)) {
				score += 18;
			}
			if (/multi[- ]?turn|dialog|interactive|replanning/.test(source)) {
				score += 16;
			}
			if (/long[- ]?horizon|planning|planner|multi[- ]?step/.test(source)) {
				score += 16;
			}
			if (/memory|stateful|personalized|preference/.test(source)) {
				score += 12;
			}
			if (/experiment|benchmark|outperform|success|baseline|ablation/.test(source)) {
				score += 10;
			} else {
				score -= 8;
			}
			if (getRepoUrl(paper)) {
				score += 8;
			}
			score = Math.max(10, Math.min(98, score));
			const label = score >= 85 ? "强烈推荐" : score >= 70 ? "值得读" : score >= 55 ? "可略读" : "暂不优先";
			const waterRisk = score >= 78 ? "低" : score >= 58 ? "中" : "高";
			const level = score >= 78 ? "高" : score >= 58 ? "中" : "低";
			const judgement = waterRisk === "低"
				? "有价值：优先进入今日精读候选。"
				: waterRisk === "中"
					? "需要谨慎：先看实验和设定是否扎实。"
					: "可能偏水：主题或实验信号偏弱，不优先。";
			return {
				score,
				level,
				label,
				waterRisk,
				judgement,
				reason: "基于标题、摘要、实验信号、代码信号和研究主题相关度的自动化初筛。",
			};
		}

		function setSortButtonState() {
			sortButtons.forEach((button) => {
				button.classList.toggle("is-active", button.dataset.paperSort === sortOrder);
			});
		}

		function getFilteredItems() {
			return allItems
				.filter((paper) => !selectedDate || getPaperDate(paper) === selectedDate)
				.sort((a, b) => {
					const dateCompare = String(getPaperDate(a)).localeCompare(String(getPaperDate(b)));
					if (dateCompare !== 0) {
						return sortOrder === "asc" ? dateCompare : -dateCompare;
					}
					return String(a.title || "").localeCompare(String(b.title || ""));
				});
		}

		function renderDateList() {
			if (!dateList) {
				return;
			}
			const counts = {};
			allItems.forEach((paper) => {
				const date = getPaperDate(paper);
				if (date) {
					counts[date] = (counts[date] || 0) + 1;
				}
			});
			dateList.innerHTML = "";
			Object.keys(counts)
				.sort((a, b) => b.localeCompare(a))
				.forEach((date) => {
					const button = document.createElement("button");
					button.type = "button";
					button.className = "paper-date-button";
					button.dataset.paperDateButton = date;
					button.classList.toggle("is-active", selectedDate === date);
					const dateLabel = document.createElement("span");
					dateLabel.textContent = date;
					const countLabel = document.createElement("span");
					countLabel.textContent = counts[date] + " 篇";
					button.appendChild(dateLabel);
					button.appendChild(countLabel);
					dateList.appendChild(button);
				});
		}

		function renderRail(items) {
			if (!list) {
				return;
			}
			list.innerHTML = "";
			items.slice(0, 6).forEach((paper) => {
				const link = document.createElement("a");
				link.className = "daily-paper-card";
				link.href = paper.url || "#";
				link.target = "_blank";
				link.rel = "noopener noreferrer";

				const meta = document.createElement("span");
				meta.textContent = [paper.published, paper.primary_category].filter(Boolean).join(" / ");
				const title = document.createElement("strong");
				title.textContent = paper.title || "Untitled paper";
				const summary = document.createElement("p");
				summary.textContent = paper.summary || "";

				link.appendChild(meta);
				link.appendChild(title);
				link.appendChild(summary);
				list.appendChild(link);
			});
		}

		function createInfoRow(label, value, asParagraph) {
			const row = document.createElement("div");
			row.className = "paper-info-row";
			const labelNode = document.createElement("strong");
			labelNode.textContent = label;
			const valueNode = asParagraph ? document.createElement("p") : document.createElement("span");
			valueNode.textContent = value;
			row.appendChild(labelNode);
			row.appendChild(valueNode);
			return row;
		}

		function createLinksRow(paper) {
			const row = document.createElement("div");
			row.className = "paper-info-row";
			const labelNode = document.createElement("strong");
			labelNode.textContent = "链接";
			const links = document.createElement("div");
			links.className = "paper-link-row";
			const arxivUrl = (paper.url || "#").replace(/^http:\/\//, "https://");
			const repoUrl = getRepoUrl(paper);

			if (arxivUrl && arxivUrl !== "#") {
				const link = document.createElement("a");
				link.href = arxivUrl;
				link.target = "_blank";
				link.rel = "noopener noreferrer";
				link.textContent = "arXiv";
				links.appendChild(link);
			}
			if (repoUrl) {
				const repo = document.createElement("a");
				repo.href = repoUrl;
				repo.target = "_blank";
				repo.rel = "noopener noreferrer";
				repo.textContent = "开源仓库";
				links.appendChild(repo);
			} else {
				const missing = document.createElement("span");
				missing.textContent = "未发现开源仓库";
				links.appendChild(missing);
			}
			row.appendChild(labelNode);
			row.appendChild(links);
			return row;
		}

		function createInterpretationGrid(paper) {
			const grid = document.createElement("div");
			grid.className = "paper-interpretation-grid";
			const interpretation = getPaperInterpretation(paper);
			Object.keys(interpretation).forEach((label) => {
				const item = document.createElement("section");
				item.className = "paper-interpretation-item";
				const heading = document.createElement("strong");
				heading.textContent = label;
				const body = document.createElement("p");
				body.textContent = interpretation[label];
				item.appendChild(heading);
				item.appendChild(body);
				grid.appendChild(item);
			});
			return grid;
		}

		function createRecommendationPanel(paper) {
			const recommendation = getRecommendation(paper);
			const panel = document.createElement("div");
			panel.className = "paper-recommendation";

			const score = document.createElement("div");
			score.className = "recommendation-score";
			const scoreValue = document.createElement("strong");
			scoreValue.textContent = recommendation.level || "中";
			const scoreLabel = document.createElement("span");
			scoreLabel.textContent = "相关度";
			score.appendChild(scoreValue);
			score.appendChild(scoreLabel);

			const judgement = document.createElement("div");
			judgement.className = "recommendation-judgement";
			const labels = document.createElement("div");
			labels.className = "recommendation-labels";
			const label = document.createElement("span");
			label.className = "recommendation-pill";
			label.textContent = recommendation.label;
			const risk = document.createElement("span");
			const riskClass = recommendation.waterRisk === "低"
				? "low"
				: recommendation.waterRisk === "中"
					? "medium"
					: recommendation.waterRisk === "高"
						? "high"
						: "unknown";
			risk.className = `recommendation-pill risk-${riskClass}`;
			risk.textContent = `偏水风险：${recommendation.waterRisk}`;
			labels.appendChild(label);
			labels.appendChild(risk);
			const body = document.createElement("p");
			body.textContent = [recommendation.judgement, recommendation.reason].filter(Boolean).join(" ");
			judgement.appendChild(labels);
			judgement.appendChild(body);

			panel.appendChild(score);
			panel.appendChild(judgement);
			return panel;
		}

		function getPaperById(id) {
			return allItems.find((paper) => getPaperKey(paper) === id);
		}

		function buildDigestText(data) {
			if (data.digest && data.digest.email_body) {
				return data.digest.email_body;
			}
			const date = data.digest && data.digest.report_date
				? data.digest.report_date
				: new Date(data.updated_at || Date.now()).toISOString().slice(0, 10);
			const top = allItems
				.slice()
				.sort((a, b) => getRecommendation(b).score - getRecommendation(a).score)
				.slice(0, 3);
			return [
				`${date} Daily Paper`,
				"",
				`今日自动化筛选 ${allItems.length} 篇候选，重点关注 agentic RL、multi-turn、long-horizon planning、agent memory 和 planning reliability。`,
				"",
				"最值得读的 3 篇",
				...top.map((paper, index) => {
					const recommendation = getRecommendation(paper);
					const brief = paper.brief || {};
					return [
						`${index + 1}. ${paper.title}`,
						`- 作者：${Array.isArray(paper.authors) ? paper.authors.join(", ") : "N/A"}`,
						`- 单位：${getAffiliations(paper)}`,
						`- 日期：${getPaperDate(paper) || "N/A"}`,
						`- 论文链接：${(paper.url || "").replace(/^http:\/\//, "https://")}`,
						`- 项目页：${paper.project_url || brief.project_url || "未发现"}`,
						`- 代码仓库：${getRepoUrl(paper) || "未发现"}`,
						`- 录用：${paper.venue_status || brief.venue_status || "未确认录用"}`,
						`- 相关度：${recommendation.level}（原因：${recommendation.reason || recommendation.label}；偏水风险：${recommendation.waterRisk}）`,
						`- 贡献：${getContribution(paper)}`,
						`- 总结：${brief.summary || paper.summary || "待自动化补充"}`,
						`- 亮点：${Array.isArray(brief.highlights) ? brief.highlights.join("；") : recommendation.judgement}`,
					].join("\n");
				}),
			].join("\n");
		}

		function createDigestList(title, papers, fallback) {
			const section = document.createElement("section");
			section.className = "digest-list";
			const heading = document.createElement("strong");
			heading.textContent = title;
			section.appendChild(heading);
			if (!papers.length) {
				const emptyText = document.createElement("p");
				emptyText.textContent = fallback;
				section.appendChild(emptyText);
				return section;
			}
			const listNode = document.createElement("ol");
			papers.forEach((paper) => {
				const item = document.createElement("li");
				const recommendation = getRecommendation(paper);
				const link = document.createElement("a");
				link.href = (paper.url || "#").replace(/^http:\/\//, "https://");
				link.target = "_blank";
				link.rel = "noopener noreferrer";
				link.textContent = paper.title || "Untitled paper";
				const meta = document.createElement("span");
				meta.textContent = `相关度 ${recommendation.level} · 偏水风险 ${recommendation.waterRisk}`;
				item.appendChild(link);
				item.appendChild(meta);
				listNode.appendChild(item);
			});
			section.appendChild(listNode);
			return section;
		}

		function renderDigest(data) {
			if (!digestBox) {
				return;
			}
			const digest = data.digest || {};
			const topIds = Array.isArray(digest.top_recommendations) ? digest.top_recommendations : [];
			const lowIds = Array.isArray(digest.low_priority) ? digest.low_priority : [];
			const topPapers = topIds.length
				? topIds.map(getPaperById).filter(Boolean)
				: allItems.slice().sort((a, b) => getRecommendation(b).score - getRecommendation(a).score).slice(0, 3);
			const lowPapers = lowIds.length
				? lowIds.map(getPaperById).filter(Boolean)
				: allItems.filter((paper) => getRecommendation(paper).waterRisk !== "低").slice(0, 3);

			digestBox.innerHTML = "";
			digestBox.hidden = false;

			const heading = document.createElement("div");
			heading.className = "digest-heading";
			const title = document.createElement("h4");
			title.textContent = digest.title || "Daily Paper 自动化摘要";
			const summary = document.createElement("p");
			summary.textContent = digest.summary || "今日自动化已生成论文初筛和阅读建议。";
			heading.appendChild(title);
			heading.appendChild(summary);
			digestBox.appendChild(heading);

			const meta = document.createElement("div");
			meta.className = "digest-meta-row";
			[digest.focus || data.query_focus, digest.no_news_policy].filter(Boolean).forEach((value) => {
				const span = document.createElement("span");
				span.textContent = value;
				meta.appendChild(span);
			});
			if (meta.children.length) {
				digestBox.appendChild(meta);
			}

			const columns = document.createElement("div");
			columns.className = "digest-columns";
			columns.appendChild(createDigestList("最值得读的 3 篇", topPapers, "今天没有高相关新增论文。"));
			columns.appendChild(createDigestList("暂不优先 / 可能偏水", lowPapers, "没有明显偏水候选。"));
			digestBox.appendChild(columns);
		}

		function copyText(text) {
			if (navigator.clipboard && navigator.clipboard.writeText) {
				return navigator.clipboard.writeText(text);
			}
			return new Promise((resolve, reject) => {
				const textarea = document.createElement("textarea");
				textarea.value = text;
				textarea.setAttribute("readonly", "");
				textarea.style.position = "fixed";
				textarea.style.left = "-9999px";
				document.body.appendChild(textarea);
				textarea.select();
				try {
					document.execCommand("copy");
					document.body.removeChild(textarea);
					resolve();
				} catch (error) {
					document.body.removeChild(textarea);
					reject(error);
				}
			});
		}

		function renderFull() {
			if (!fullList) {
				return;
			}
			const items = getFilteredItems();
			fullList.innerHTML = "";
			setEmpty(
				fullEmpty,
				"当前日期没有 Daily Paper。",
				Boolean(items.length)
			);
			items.forEach((paper) => {
				const key = getPaperKey(paper);
				const card = document.createElement("article");
				card.className = "academic-paper-card";
				card.dataset.paperKey = key;

				const meta = document.createElement("div");
				meta.className = "academic-paper-meta";
				const authors = Array.isArray(paper.authors) ? paper.authors.slice(0, 2).join(", ") : "";
				[paper.published, paper.primary_category, authors].filter(Boolean).forEach((value) => {
					const span = document.createElement("span");
					span.textContent = value;
					meta.appendChild(span);
				});

				const top = document.createElement("div");
				top.className = "paper-card-top";
				const titleWrap = document.createElement("div");
				titleWrap.className = "paper-card-title";
				const title = document.createElement("h3");
				const titleLink = document.createElement("a");
				titleLink.href = (paper.url || "#").replace(/^http:\/\//, "https://");
				titleLink.target = "_blank";
				titleLink.rel = "noopener noreferrer";
				titleLink.textContent = paper.title || "Untitled paper";
				title.appendChild(titleLink);
				titleWrap.appendChild(meta);
				titleWrap.appendChild(title);

				const actions = document.createElement("div");
				actions.className = "paper-card-actions";
				const arxivLink = document.createElement("a");
				arxivLink.href = titleLink.href;
				arxivLink.target = "_blank";
				arxivLink.rel = "noopener noreferrer";
				arxivLink.textContent = "打开 arXiv";
				actions.appendChild(arxivLink);
				const repoUrl = getRepoUrl(paper);
				if (repoUrl) {
					const repoLink = document.createElement("a");
					repoLink.href = repoUrl;
					repoLink.target = "_blank";
					repoLink.rel = "noopener noreferrer";
					repoLink.textContent = "代码仓库";
					actions.appendChild(repoLink);
				}
				top.appendChild(titleWrap);
				top.appendChild(actions);

				const recommendation = createRecommendationPanel(paper);

				const info = document.createElement("div");
				info.className = "paper-info-grid";
				info.appendChild(createInfoRow("作者", Array.isArray(paper.authors) ? paper.authors.join(", ") : "N/A", true));
				info.appendChild(createInfoRow("单位", getAffiliations(paper)));
				info.appendChild(createInfoRow("开源仓库", repoUrl || "未发现公开仓库"));
				info.appendChild(createInfoRow("录用", paper.venue_status || (paper.brief && paper.brief.venue_status) || "未确认录用"));
				info.appendChild(createInfoRow("贡献", getContribution(paper), true));
				info.appendChild(createLinksRow(paper));

				const interpretation = createInterpretationGrid(paper);

				const tags = document.createElement("div");
				tags.className = "academic-paper-tags";
				getPaperTags(paper).forEach((tag) => {
					const span = document.createElement("span");
					span.textContent = tag;
					tags.appendChild(span);
				});

				card.appendChild(top);
				card.appendChild(recommendation);
				card.appendChild(info);
				card.appendChild(interpretation);
				card.appendChild(tags);
				fullList.appendChild(card);
			});
			renderDateList();
			setSortButtonState();
		}

		function renderEmptyState(message) {
			if (list) {
				list.innerHTML = "";
			}
			if (fullList) {
				fullList.innerHTML = "";
			}
			setEmpty(empty, message, false);
			setEmpty(fullEmpty, message, false);
		}

		function findPaperByKey(key) {
			return allItems.find((paper) => getPaperKey(paper) === key);
		}

		if (digestCopy) {
			digestCopy.addEventListener("click", () => {
				if (!currentDigestText) {
					if (digestStatus) {
						digestStatus.textContent = "暂无可复制的邮件摘要";
					}
					return;
				}
				copyText(currentDigestText)
					.then(() => {
						if (digestStatus) {
							digestStatus.textContent = "已复制";
						}
					})
					.catch(() => {
						if (digestStatus) {
							digestStatus.textContent = "浏览器未允许复制，可打开 data JSON 查看 email_body";
						}
					});
			});
		}

		if (dateInput) {
			dateInput.addEventListener("change", () => {
				selectedDate = dateInput.value;
				renderFull();
			});
		}

		if (dateClear) {
			dateClear.addEventListener("click", () => {
				selectedDate = "";
				if (dateInput) {
					dateInput.value = "";
				}
				renderFull();
			});
		}

		if (dateList) {
			dateList.addEventListener("click", (event) => {
				const button = event.target.closest("[data-paper-date-button]");
				if (!button) {
					return;
				}
				selectedDate = button.dataset.paperDateButton;
				if (dateInput) {
					dateInput.value = selectedDate;
				}
				renderFull();
			});
		}

		sortButtons.forEach((button) => {
			button.addEventListener("click", () => {
				sortOrder = button.dataset.paperSort === "asc" ? "asc" : "desc";
				window.localStorage.setItem(SORT_STORAGE_KEY, sortOrder);
				renderFull();
			});
		});

		fetch("assets/content/data/daily-papers.json", { cache: "no-store" })
			.then((response) => {
				if (!response.ok) {
					throw new Error("Daily paper data missing");
				}
				return response.json();
			})
			.then((data) => {
				const items = data.items || [];
				allItems = items.slice();
				currentDigestText = buildDigestText(data);
				setUpdatedLabel(data);
				if (!items.length) {
					renderEmptyState("Waiting for the first arXiv update.");
					renderDigest(data);
					return;
				}
				setEmpty(empty, "", true);
				setEmpty(fullEmpty, "", true);
				renderDigest(data);
				renderRail(items);
				renderFull();
			})
			.catch(() => {
				renderEmptyState("Daily paper data is not available yet.");
			});
	}

	function bindZoteroPaperList() {
		const list = document.querySelector("[data-zotero-paper-list]");
		const summaryNode = document.querySelector("[data-paper-list-summary]");
		const empty = document.querySelector("[data-zotero-paper-empty]");
		if (!list) {
			return;
		}

		function compact(text, maxLength) {
			const value = String(text || "").replace(/\s+/g, " ").trim();
			if (value.length <= maxLength) {
				return value;
			}
			return value.slice(0, maxLength - 1).trim() + "...";
		}

		function levelRank(level) {
			if (level === "高") return 0;
			if (level === "中") return 1;
			return 2;
		}

		function setEmpty(message, hidden) {
			if (empty) {
				empty.hidden = hidden;
				empty.textContent = message;
			}
		}

		function renderSummary(data) {
			if (!summaryNode) {
				return;
			}
			const groups = Array.isArray(data.groups) ? data.groups : [];
			summaryNode.innerHTML = "";
			const total = document.createElement("span");
			total.textContent = `${(data.items || []).length} papers`;
			summaryNode.appendChild(total);
			groups
				.filter((group) => group.count)
				.slice(0, 7)
				.forEach((group) => {
					const chip = document.createElement("span");
					chip.textContent = `${group.short || group.name}: ${group.count}`;
					summaryNode.appendChild(chip);
				});
		}

		function appendMeta(parent, values) {
			const meta = document.createElement("div");
			meta.className = "academic-paper-meta";
			values.filter(Boolean).forEach((value) => {
				const span = document.createElement("span");
				span.textContent = value;
				meta.appendChild(span);
			});
			parent.appendChild(meta);
		}

		function renderItems(data) {
			const items = Array.isArray(data.items) ? data.items : [];
			list.innerHTML = "";
			renderSummary(data);
			if (!items.length) {
				setEmpty("Zotero Paper List is not available yet.", false);
				return;
			}
			setEmpty("", true);
			items
				.slice()
				.sort((a, b) => {
					const levelCompare = levelRank(a.level) - levelRank(b.level);
					if (levelCompare !== 0) {
						return levelCompare;
					}
					return String(b.year || "").localeCompare(String(a.year || ""));
				})
				.slice(0, 30)
				.forEach((paper) => {
					const card = document.createElement("article");
					card.className = "zotero-paper-card";

					appendMeta(card, [
						paper.year || "年份待确认",
						(paper.collections || []).slice(0, 2).join(" / "),
					]);

					const title = document.createElement("h3");
					if (paper.url) {
						const link = document.createElement("a");
						link.href = paper.url;
						link.target = "_blank";
						link.rel = "noopener noreferrer";
						link.textContent = paper.title || "Untitled paper";
						title.appendChild(link);
					} else {
						title.textContent = paper.title || "Untitled paper";
					}
					card.appendChild(title);

					const level = document.createElement("div");
					level.className = "paper-level";
					const value = document.createElement("strong");
					value.textContent = `价值：${paper.level || "中"}`;
					const reason = document.createElement("span");
					reason.textContent = paper.reason || "基于 Zotero 分类和题名的 Codex 静态分析。";
					level.appendChild(value);
					level.appendChild(reason);
					card.appendChild(level);

					const analysis = document.createElement("p");
					analysis.textContent = compact(paper.summary || paper.takeaway || "待补充分析。", 180);
					card.appendChild(analysis);

					const links = document.createElement("div");
					links.className = "paper-link-row";
					if (paper.url) {
						const source = document.createElement("a");
						source.href = paper.url;
						source.target = "_blank";
						source.rel = "noopener noreferrer";
						source.textContent = "论文链接";
						links.appendChild(source);
					}
					if (paper.repo_url) {
						const repo = document.createElement("a");
						repo.href = paper.repo_url;
						repo.target = "_blank";
						repo.rel = "noopener noreferrer";
						repo.textContent = "开源仓库";
						links.appendChild(repo);
					}
					if (links.children.length) {
						card.appendChild(links);
					}

					list.appendChild(card);
				});
		}

		fetch("assets/content/data/zotero-paper-list.json", { cache: "no-store" })
			.then((response) => {
				if (!response.ok) {
					throw new Error("Zotero paper list data missing");
				}
				return response.json();
			})
			.then(renderItems)
			.catch(() => {
				list.innerHTML = "";
				if (summaryNode) {
					summaryNode.innerHTML = "";
				}
				setEmpty("Zotero Paper List is not available yet.", false);
			});
	}

	window.addEventListener("DOMContentLoaded", () => {
			bindContentFilters();
			bindLocalAnchors();
			bindHashNavigation();
			bindThemeToggle();
		bindGlassTopbar();
		bindNoteViewToggle();
		bindExternalDropdown();
		bindMemoManager();
		bindDailyPapers();
		bindZoteroPaperList();
		revealInitialHash();
	});
