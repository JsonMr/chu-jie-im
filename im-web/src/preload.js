import {
	contextBridge,
	ipcRenderer,
	clipboard,
	nativeImage
} from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
	// 渲染进程 -> 主进程
	sendEvent: (channel, data) => ipcRenderer.send(channel, data),

	// 主进程 -> 渲染进程 (单向)
	receive: (channel, callback) => {
		ipcRenderer.on(channel, (event, ...args) => callback(...args))
	},

	// 双向通信（请求/响应模式）
	invoke: (channel, data) => ipcRenderer.invoke(channel, data),
	// 接收 base64 格式的图片数据并复制到系统剪贴板
	// copyImageToClipboard: (base64Data) => {
	// 	// 去掉 base64 前缀 (如 data:image/png;base64,)
	// 	const base64Image = base64Data.split(';base64,').pop()
	// 	const img = nativeImage.createFromDataURL('data:image/png;base64,' + base64Image)
	// 	clipboard.writeImage(img)
	// },
	copyImageToClipboard: (base64Data) => {
	    // 1. 创建一个临时的 Image 对象来加载传入的 base64 图片（无论是 jpeg 还是 png）
	    const img = new Image()
	    img.src = base64Data
	
	    img.onload = () => {
	      // 2. 创建 Canvas 并将图片绘制上去
	      const canvas = document.createElement('canvas')
	      canvas.width = img.width
	      canvas.height = img.height
	      const ctx = canvas.getContext('2d')
	      ctx.drawImage(img, 0, 0)
	
	      // 3. 核心步骤：将 Canvas 强制导出为 image/png 格式的 base64
	      // 这一步能完美解决 Electron 对某些 JPEG 格式处理失效的问题
	      const pngBase64 = canvas.toDataURL('image/png')
	      
	      // 4. 使用转换后的 PNG 数据创建 nativeImage 并写入剪贴板
	      const nativeImg = nativeImage.createFromDataURL(pngBase64)
	      if (!nativeImg.isEmpty()) {
	        clipboard.writeImage(nativeImg)
	        console.log('桌面端：图片(PNG)已成功复制到剪贴板')
	      } else {
	        console.error('桌面端：图片转换失败，nativeImage 为空')
	      }
	    }
	
	    img.onerror = (err) => {
	      console.error('桌面端：图片加载失败', err)
	    }
	  }
})