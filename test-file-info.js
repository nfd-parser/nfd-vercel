/**
 * 测试文件信息提取功能
 */

const { normalizeFileSize, getFileType } = require('./utils/file-utils');

// 模拟HTML内容
const testHtml = `<!DOCTYPE html>
<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=0" />
<title>文件</title>
<meta name="description" content="文件大小：920.1 K|" />
<link href="https://assets.woozooo.com/assets/img/t0.css?v7" rel="stylesheet" type="text/css">
<link rel="shortcut icon" href="https://assets.woozooo.com/assets/favicon.ico">
</head>
<body>
<div class="top" id="top"></div>
<div class="pc bgimg"></div>
<div class="d">
<div style="font-size: 30px;text-align: center;padding: 56px 0px 20px 0px;">w.zip</div>
<div class="d2">
<div>
<table width="99%" border="0" align="center" cellspacing="0">
  <tr>
    <td width="330" valign="top">
<span class="p7">文件大小：</span>920.1 K<br>
<span class="p7">上传时间：</span>2025-03-01<br><span class="p7">分享用户：</span><font>微信公众号玉玉软件库</font><br>
<span class="p7">运行系统：</span>压缩文件<br>
<span class="p7">文件描述：</span><br>
	  </td>
    <td>&nbsp;</td>
  <td width="315" align="right">
    </td>
  </tr>
</table>
</div>
<div class="d3">
</div>
<div class="load2">
<div class="loader"></div>
</div>
<div class="ifr">
<iframe class="ifr2" name="1750391537" src="/fn?BWMHbQ9gVTMFZgtoVjIHNQFqAzRWPldzVyQGPVU4U2UIPVo9AG4EaQhvVzRTNFRiUi4DcV9lAGALfwRrXGdXOAVuBzUPK1U8BWoLPFZSB3MBfQNxVmhXM1cPBnBValM9CGZaMABtBHYIN1dyU1hUIlJpA2BfZABtC2EEY1xpVzgFOAc4DyZVdQUjCy5WOAcpAXQDcVZoVzNXfgZ3VWZTPQhyWmIAMgQ_aCHBXYlNoVDhSJw_c_c" frameborder="0" scrolling="no"></iframe>
</div>
<div class="d3">
</div>
</div>
</div>
<script type="text/javascript">
　　if (window!=top)
　　top.location.href = window.location.href;
	var fid = 225503127;
</script>
<div class="foot_info"><div id="jingshi"></div><div id= "foot_info"></div></div>
<script type="text/javascript" src="https://assets.woozooo.com/assets/share/pc3.js"></script>
<div style="display:none"><script src="https://statics.woozooo.com/img/bd.js"></script><script src="https://statics.woozooo.com/img/hm.js"></script></div>
</body>
</html>`;

// 测试文件信息提取函数
function extractFileInfo(html) {
  try {
    const fileInfo = {
      fileName: '',
      fileSize: '',
      fileType: '',
      uploadTime: '',
      uploader: '',
      description: ''
    };

    console.log('Extracting file info from HTML, length:', html.length);

    // 提取文件名 - 从页面内容中的div标签
    const nameMatch = html.match(/<div[^>]*style="[^"]*font-size:\s*30px[^"]*"[^>]*>([^<]+)<\/div>/);
    if (nameMatch) {
      fileInfo.fileName = nameMatch[1].trim();
      console.log('File name from div:', fileInfo.fileName);
    }

    // 提取文件大小 - 从页面内容中的span标签
    const sizeMatch = html.match(/<span[^>]*>文件大小：<\/span>([^<>\s]+(?:\s*[A-Za-z]+)?)/);
    if (sizeMatch) {
      const rawSize = sizeMatch[1].trim();
      console.log('Raw file size extracted:', rawSize);
      fileInfo.fileSize = normalizeFileSize(rawSize);
      console.log('Normalized file size:', fileInfo.fileSize);
    }

    // 提取上传时间 - 从页面内容中的span标签
    const timeMatch = html.match(/<span[^>]*>上传时间：<\/span>([^<>\n\r]+)/);
    if (timeMatch) {
      fileInfo.uploadTime = timeMatch[1].trim();
      console.log('Upload time extracted:', fileInfo.uploadTime);
    }

    // 提取分享用户 - 从页面内容中的span和font标签
    const userMatch = html.match(/<span[^>]*>分享用户：<\/span><font>([^<]+)<\/font>/);
    if (userMatch) {
      fileInfo.uploader = userMatch[1].trim();
      console.log('Uploader extracted:', fileInfo.uploader);
    }

    // 提取运行系统/文件类型 - 从页面内容中的span标签
    const typeMatch = html.match(/<span[^>]*>运行系统：<\/span>([^<>\n\r]+)/);
    if (typeMatch) {
      fileInfo.fileType = typeMatch[1].trim();
      console.log('File type extracted:', fileInfo.fileType);
    }

    // 提取文件描述 - 从页面内容
    const descMatch = html.match(/<span[^>]*>文件描述：<\/span><br>\s*([^<]+)/);
    if (descMatch) {
      fileInfo.description = descMatch[1].trim();
      console.log('Description extracted:', fileInfo.description);
    }

    // 如果没有从页面提取到文件类型，根据文件名推断
    if (!fileInfo.fileType && fileInfo.fileName) {
      fileInfo.fileType = getFileType(fileInfo.fileName);
      console.log('File type inferred from filename:', fileInfo.fileType);
    }

    // 清理数据，移除可能的HTML标签残留
    Object.keys(fileInfo).forEach(key => {
      if (typeof fileInfo[key] === 'string') {
        fileInfo[key] = fileInfo[key].replace(/<[^>]*>/g, '').trim();
      }
    });

    console.log('Final extracted file info:', fileInfo);
    return fileInfo;
  } catch (error) {
    console.error('Extract file info failed:', error);
    return {
      fileName: '蓝奏云文件',
      fileSize: '未知',
      fileType: '未知',
      uploadTime: '',
      uploader: '',
      description: ''
    };
  }
}

// 运行测试
console.log('=== 文件信息提取测试 ===');
const result = extractFileInfo(testHtml);
console.log('\n=== 最终结果 ===');
console.log(JSON.stringify(result, null, 2)); 