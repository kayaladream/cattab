'use client';

import { useState, useEffect, useRef } from 'react';
import { Lunar } from 'lunar-javascript';

export default function Home() {
  // --- 状态管理 ---
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  const [lunarDate, setLunarDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [links, setLinks] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  
  const [bgName, setBgName] = useState('cat');
  const [engines, setEngines] = useState([]);
  const [currentEngine, setCurrentEngine] = useState({ name: '百度', url: 'https://www.baidu.com/s?wd=' });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const [startLoadVideo, setStartLoadVideo] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);

  // --- 导航栏收纳逻辑 ---
  const [visibleLinks, setVisibleLinks] = useState([]); 
  const [hiddenLinks, setHiddenLinks] = useState([]);   
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false); 
  const moreMenuRef = useRef(null); 
  const searchContainerRef = useRef(null);

  // --- 初始化逻辑 ---
  useEffect(() => {
    setYear(new Date().getFullYear());

    // 1. 背景选择
    const envBg = process.env.NEXT_PUBLIC_BACKGROUND_LIST;
    let bgList = ['cat']; 
    if (envBg) {
      if (envBg === 'all') {
        bgList = ['cat'];
        for (let i = 1; i < 30; i++) {
          bgList.push(`cat${i}`);
        }
      } else {
        bgList = envBg.split(',').map(s => s.trim()).filter(Boolean);
      }
    }
    if (bgList.length > 0) {
      setBgName(bgList[Math.floor(Math.random() * bgList.length)]);
    }

    // 2. 延迟加载视频
    const videoTimer = setTimeout(() => setStartLoadVideo(true), 800); 

    // 3. 核心：智能布局算法 (Canvas 测量法)
    const calculateLayout = (allLinks) => {
      // 如果没有链接，直接返回
      if (!allLinks || allLinks.length === 0) return;

      const screenWidth = window.innerWidth;
      const isDesktop = screenWidth > 1024;

      // 1. 获取容器可用宽度
      // 电脑端：总宽 - 760px (左右各380)
      // 手机端：总宽 - 32px (左右各16)
      const containerPadding = isDesktop ? 760 : 32;
      const availableWidth = screenWidth - containerPadding;

      // 2. 准备测量工具
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      // 设置字体以匹配 CSS (电脑 14px, 手机 12px)
      context.font = isDesktop ? '200 14px sans-serif' : '200 12px sans-serif';

      // 样式常量
      // padding: px-3 => 12px * 2 = 24px
      // gap: sm:gap-4 (16px) / gap-2 (8px)
      const itemPadding = 24; 
      const itemGap = isDesktop ? 16 : 8;
      const moreButtonWidth = 50; // "..." 按钮的预留宽度

      let currentRow = 1;
      let currentLineWidth = 0;
      let visibleCount = 0;

      // 3. 开始模拟填充
      for (let i = 0; i < allLinks.length; i++) {
        const link = allLinks[i];
        
        // 测量当前链接的宽度 (文字宽 + 内边距 + 少量缓冲)
        const textMetrics = context.measureText(link.name);
        const linkWidth = textMetrics.width + itemPadding + 2; // +2px buffer

        // 尝试放入当前行
        // 如果不是第一个元素，要加上 gap
        const widthToAdd = (currentLineWidth === 0) ? linkWidth : (itemGap + linkWidth);

        if (currentLineWidth + widthToAdd <= availableWidth) {
          // 能放下，直接加
          currentLineWidth += widthToAdd;
          visibleCount++;
        } else {
          // 放不下，换行
          currentRow++;
          currentLineWidth = linkWidth; // 新起一行，当前宽度就是这个元素的宽度
          
          // 如果换行后，行数 > 2，说明第3行开始了 -> 立即停止！
          if (currentRow > 2) {
            break; 
          }
          visibleCount++;
        }
      }

      // 4. 后处理：如果有被隐藏的链接，我们需要确保 "..." 按钮能放得进第2行
      // 如果所有链接都显示了，就不需要处理
      if (visibleCount < allLinks.length) {
        // 既然有隐藏的，说明刚才填满了2行，或者刚溢出。
        // 为了安全起见，我们通常回退 1 个，把位置让给 "..."
        // 这样能绝对保证第2行末尾不会因为加了 "..." 而挤出第3行
        visibleCount = Math.max(0, visibleCount - 1);
      }

      setVisibleLinks(allLinks.slice(0, visibleCount));
      setHiddenLinks(allLinks.slice(visibleCount));
    };

    const envLinks = process.env.NEXT_PUBLIC_NAV_LINKS;
    let parsedLinks = [{ name: '演示-淘宝', url: 'https://www.taobao.com' }];
    if (envLinks) {
      try { parsedLinks = JSON.parse(envLinks); } catch (e) { console.error(e); }
    }
    setLinks(parsedLinks);
    
    // 稍微延迟一下计算，等待字体加载，提高准确度
    setTimeout(() => calculateLayout(parsedLinks), 100);

    const onResize = () => calculateLayout(parsedLinks);
    window.addEventListener('resize', onResize);

    // 4. 搜索引擎
    const envEngines = process.env.NEXT_PUBLIC_SEARCH_ENGINES;
    let loadedEngines = [
      { name: '百度', url: 'https://www.baidu.com/s?wd=' },
      { name: 'Google', url: 'https://www.google.com/search?q=' },
      { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
      { name: '必应', url: 'https://www.bing.com/search?q=' },
      { name: '360', url: 'https://www.so.com/s?q=' },
      { name: '搜狗', url: 'https://www.sogou.com/web?query=' },
    ];
    if (envEngines) {
      try {
        const parsed = JSON.parse(envEngines);
        if (parsed.length > 0) loadedEngines = parsed;
      } catch (e) { console.error(e); }
    }
    setEngines(loadedEngines);
    setCurrentEngine(loadedEngines[0]);

    // 5. 时间
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
      setDate(now.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', weekday: 'long' }));
      const lunar = Lunar.fromDate(now);
      setLunarDate(`农历 ${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);

    // 6. 点击关闭
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setIsMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      clearInterval(timer);
      clearTimeout(videoTimer);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    window.location.href = `${currentEngine.url}${encodeURIComponent(searchQuery)}`;
  };

  const handleEngineSelect = (engine) => {
    setCurrentEngine(engine);
    setIsDropdownOpen(false);
  };

  return (
    <main className="relative w-full h-screen overflow-hidden text-white font-sans">
      
      {/* 滚动条样式 */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { 
          background-color: rgba(255, 255, 255, 0.2); 
          border-radius: 9999px; 
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(255, 255, 255, 0.4); }
      `}</style>

      {/* 静态图 & 视频 */}
      <img src={`/background/${bgName}.jpg`} alt="Background" className="absolute top-0 left-0 w-full h-full object-cover z-0" />
      {startLoadVideo && (
        <video
          autoPlay loop muted playsInline key={bgName} 
          onCanPlay={() => setIsVideoReady(true)}
          className={`absolute top-0 left-0 w-full h-full object-cover z-0 transition-opacity duration-1000 ease-in-out ${isVideoReady ? 'opacity-100' : 'opacity-0'}`}
        >
          <source src={`/background/${bgName}.mp4`} type="video/mp4" />
        </video>
      )}
      <div className="absolute top-0 left-0 w-full h-full bg-black/10 z-10 pointer-events-none" />

      {/* GitHub 链接 */}
      <a href="https://github.com/kayaladream/cat-new-tab" target="_blank" rel="noopener noreferrer" className="absolute top-6 right-6 z-50 text-white/70 hover:text-white transition-all hover:scale-110 drop-shadow-md">
        <svg height="28" width="28" viewBox="0 0 16 16" fill="currentColor"><path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path></svg>
      </a>

      {/* 中间内容 */}
      <div className="relative z-20 flex flex-col items-center pt-44 h-full w-full px-4">
        <div className="flex items-end gap-3 mb-8 drop-shadow-md select-none">
          <h1 className="text-7xl font-light tracking-wide">{time}</h1>
          <div className="flex flex-col text-sm font-medium opacity-90 pb-2 gap-1">
            <span>{date}</span><span className="text-xs opacity-70 tracking-wider">{lunarDate}</span>
          </div>
        </div>
        <form ref={searchContainerRef} onSubmit={handleSearch} className="w-full max-w-xl relative z-50">
          <div className="relative flex items-center bg-white/90 backdrop-blur-sm rounded-full h-12 px-2 shadow-lg transition-all duration-300 hover:bg-white">
            <button type="button" className="pl-4 pr-3 flex items-center gap-1 cursor-pointer border-r border-gray-300/50 h-3/5 hover:opacity-70 focus:outline-none" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
              <span className="text-gray-600 text-sm font-bold select-none whitespace-nowrap min-w-[3em] text-center">{currentEngine.name}</span>
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 text-gray-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {isDropdownOpen && (
              <div className="absolute top-14 left-0 w-36 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                {engines.map((engine, index) => (
                  <div key={index} onClick={() => handleEngineSelect(engine)} className={`px-4 py-2 text-sm cursor-pointer rounded-lg transition-all duration-200 hover:bg-black/5 hover:scale-105 ${currentEngine.name === engine.name ? 'text-black font-extrabold' : 'text-gray-600 font-medium'}`}>{engine.name}</div>
                ))}
              </div>
            )}
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 bg-transparent border-none outline-none text-gray-800 text-sm h-full px-3" autoFocus />
            <button type="submit" className="h-9 w-9 bg-[#2c2c2c] rounded-full flex items-center justify-center hover:bg-black transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </button>
          </div>
        </form>
      </div>

      {/* 底部导航区域 */}
      <div className="absolute bottom-[40px] w-full z-30 flex justify-center">
        <div className="absolute -bottom-10 left-0 w-full h-80 bg-gradient-to-t from-blue-300/20 to-transparent pointer-events-none" />
        
        <div className="relative flex flex-wrap justify-center content-start gap-2 sm:gap-4 h-28 overflow-visible w-full px-4 lg:px-[380px]">
          {visibleLinks.map((link, index) => (
            <a key={index} href={link.url} className="text-xs sm:text-sm font-extralight text-white/90 tracking-wider px-3 py-2 rounded-full transition-all duration-200 hover:bg-white/20 hover:text-white hover:backdrop-blur-sm h-fit">
              {link.name}
            </a>
          ))}

          {/* ... 更多按钮 */}
          {hiddenLinks.length > 0 && (
            <div className="relative h-fit" ref={moreMenuRef}>
              <button onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)} className="text-sm sm:text-base font-bold text-white/90 tracking-wider w-10 h-9 flex items-center justify-center rounded-full transition-all duration-200 hover:bg-white/20 hover:text-white hover:backdrop-blur-sm">•••</button>

              {isMoreMenuOpen && (
                <div 
                  className="absolute bottom-28 left-1/2 -translate-x-1/2 w-56 flex flex-col gap-1 z-50 animate-in fade-in zoom-in-95 duration-200 max-h-80 overflow-y-auto custom-scrollbar"
                  style={{
                    maskImage: 'linear-gradient(to bottom, transparent, black 15px, black calc(100% - 15px), transparent)',
                    WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 15px, black calc(100% - 15px), transparent)'
                  }}
                >
                   <div className="flex flex-col gap-1 py-4">
                     {hiddenLinks.map((link, idx) => (
                       <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" className="block px-4 py-2 text-xs sm:text-sm text-center text-white/90 font-extralight rounded-full transition-all duration-200 hover:bg-white/20 hover:text-white">
                         {link.name}
                       </a>
                     ))}
                   </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 底部版权信息 */}
      <div className="absolute bottom-2 w-full text-center z-40">
        <p className="text-[10px] sm:text-xs text-white/40 font-light tracking-wider select-none">
          Copyright © {year} KayalaDream All Rights Reserved
        </p>
      </div>
    </main>
  );
}
