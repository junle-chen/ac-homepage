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
		$(".card-inner").classList.add("in");
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

	if (!noteSearch || !noteCards.length) {
		return;
	}

	function matches(card, query) {
		if (!query) {
			return true;
		}
		const haystack = [
			card.dataset.title,
			card.dataset.tags,
			card.dataset.excerpt,
		]
			.join(" ")
			.toLowerCase();
		return haystack.indexOf(query) !== -1;
	}

	function applyFilter() {
		const query = noteSearch.value.trim().toLowerCase();
		let visible = 0;
		noteCards.forEach((card) => {
			const matched = matches(card, query);
			card.hidden = !matched;
			if (matched) {
				visible += 1;
			}
		});
		if (noteEmpty) {
			noteEmpty.hidden = visible !== 0;
		}
	}

	noteSearch.addEventListener("input", applyFilter);
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
				loadAll();
				window.history.replaceState(null, "", hash);
				setTimeout(() => scrollMainToHash(hash), 500);
			});
		});
}

function revealInitialHash() {
	if (!window.location.hash || window.location.hash === "#") {
		return;
	}
	loadAll();
	setTimeout(() => scrollMainToHash(window.location.hash), 1300);
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

window.addEventListener("DOMContentLoaded", () => {
	bindContentFilters();
	bindLocalAnchors();
	bindThemeToggle();
	revealInitialHash();
});
