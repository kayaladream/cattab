'use client';

import { useState, useEffect } from 'react';
// 引入农历转换工具
import { Lunar } from 'lunar-javascript';

export default function Home() {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  const [lunarDate, setLunarDate] = useState(''); // 新增农历状态
  const [searchQuery, setSearchQuery] = useState('');
  const [links, setLinks] = useState([]);

  // 初始化
  useEffect(() => {
    // 1. 读取环境变量链接
    const envLinks = process.env.NEXT_PUBLIC_NAV_LINKS;
    if (envLinks) {
      try {
        setLinks(JSON.parse(envLinks));
      } catch (e) {
        console.error("环境变量解析失败", e);
      }
    } else {
      setLinks([
        { name: '演示-淘宝', url: 'https://www.taobao.com' },
      ]);
    }

    // 2. 时间更新逻辑
    const updateTime = () => {
      const now = new Date();
      
      // 时间 HH:MM
      const timeString = now.toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      // 公历日期 MM/DD 星期X
      const dateString = now.toLocaleDateString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        weekday: 'long'
      }); 

      // --- 农历计算部分 Start ---
      const lunar = Lunar.fromDate(now);
      const lunarString = `农历 ${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`;
      // --- 农历计算部分 End ---
      
      setTime(timeString);
      setDate(dateString);
      setLunarDate(lunarString);
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    window.location.href = `https://www.baidu.com/s?wd=${encodeURIComponent(searchQuery)}`;
  };

  return (
    <main className="relative w-full h-screen overflow-hidden text-white font-sans">
      
      {/* 背景视频 */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover z-0"
      >
        <source src="/background/cat.mp4" type="video/mp4" />
      </video>
      
      {/* 遮罩层 */}
      <div className="absolute top-0 left-0 w-full h-full bg-black/10 z-10 pointer-events-none" />

      {/* 主体内容 (保留了 pt-32 的上移设置) */}
      <div className="relative z-20 flex flex-col items-center pt-1 h-full w-full px-4">
        
        {/* 时钟区域 */}
        <div className="flex items-end gap-3 mb-8 drop-shadow-md select-none">
          <h1 className="text-7xl font-light tracking-wide">{time}</h1>
          <div className="flex flex-col text-sm font-medium opacity-90 pb-2 gap-1">
            <span>{date}</span>
            {/* 这里现在显示真正的农历了 */}
            <span className="text-xs opacity-70 tracking-wider">{lunarDate}</span>
          </div>
        </div>

        {/* 搜索框 */}
        <form onSubmit={handleSearch} className="w-full max-w-xl relative group">
          <div className="relative flex items-center bg-white/90 backdrop-blur-sm rounded-full h-12 px-2 shadow-lg transition-all duration-300 group-hover:bg-white">
            <div className="pl-4 pr-2 text-gray-500 text-sm font-bold select-none cursor-default">
              百度
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-gray-800 text-sm h-full px-2"
              autoFocus
            />
            <button 
              type="submit" 
              className="h-9 w-9 bg-[#2c2c2c] rounded-full flex items-center justify-center hover:bg-black transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </form>
      </div>

      {/* 底部导航 */}
      <div className="absolute bottom-0 w-full z-30 pb-8 sm:pb-12">
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-blue-300/30 to-transparent pointer-events-none" />

        <div className="relative flex flex-wrap justify-center gap-6 sm:gap-10 px-4">
          {links.map((link, index) => (
            <a
              key={index}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`
                text-sm sm:text-base font-medium text-white/90 tracking-wider transition-all duration-200
                hover:text-white hover:scale-110 drop-shadow-md
                ${index === 0 ? 'bg-white/20 px-4 py-1 rounded-full backdrop-blur-md' : 'py-1'}
              `}
            >
              {link.name}
            </a>
          ))}
          <button className="text-white/70 hover:text-white text-lg leading-none pb-1">+</button>
        </div>
      </div>
    </main>
  );
}
