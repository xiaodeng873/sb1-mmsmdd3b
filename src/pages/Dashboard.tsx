import React from 'react';
import { Calendar, Users, Pill, FileText, TrendingUp, Clock, CalendarCheck } from 'lucide-react';
import { usePatients } from '../context/PatientContext';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { patients, schedules, prescriptions, followUpAppointments, loading } = usePatients();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }
  const todaySchedules = schedules.filter(s => 
    new Date(s.到診日期).toDateString() === new Date().toDateString()
  );

  const thisWeekSchedules = schedules.filter(s => {
    const scheduleDate = new Date(s.到診日期);
    const today = new Date();
    const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
    const weekEnd = new Date(today.setDate(today.getDate() - today.getDay() + 6));
    return scheduleDate >= weekStart && scheduleDate <= weekEnd;
  });

  const recentPrescriptions = prescriptions
    .sort((a, b) => new Date(b.處方日期).getTime() - new Date(a.處方日期).getTime())
    .slice(0, 5);

  const upcomingFollowUps = followUpAppointments
    .filter(a => (a.狀態 === '已安排' || a.狀態 === '尚未安排') && new Date(a.覆診日期) >= new Date())
    .sort((a, b) => new Date(a.覆診日期).getTime() - new Date(b.覆診日期).getTime())
    .slice(0, 5);

  const stats = [
    {
      title: '總院友數',
      value: patients.length,
      icon: Users,
      color: 'bg-blue-500',
      change: '+2 本月'
    },
    {
      title: '今日排程',
      value: todaySchedules.length,
      icon: Calendar,
      color: 'bg-green-500',
      change: `${todaySchedules.reduce((sum, s) => sum + s.院友列表.length, 0)} 位院友`
    },
    {
      title: '本週排程',
      value: thisWeekSchedules.length,
      icon: Clock,
      color: 'bg-orange-500',
      change: `${thisWeekSchedules.reduce((sum, s) => sum + s.院友列表.length, 0)} 位院友`
    },
    {
      title: '處方記錄',
      value: prescriptions.length,
      icon: Pill,
      color: 'bg-purple-500',
      change: '+5 本週'
    },
    {
      title: '待覆診',
      value: upcomingFollowUps.length,
      icon: CalendarCheck,
      color: 'bg-indigo-500',
      change: `${followUpAppointments.filter(a => a.狀態 === '已安排' || a.狀態 === '尚未安排').length} 已安排`
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">系統總覽</h1>
        <div className="text-sm text-gray-500">
          最後更新: {new Date().toLocaleString('zh-TW')}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="card p-6 hover-scale">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-500 mt-1">{stat.change}</p>
                </div>
                <div className={`p-3 rounded-full ${stat.color} text-white`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">今日排程</h2>
            <Link 
              to="/scheduling" 
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              查看全部
            </Link>
          </div>
          <div className="space-y-3">
            {todaySchedules.length > 0 ? (
              todaySchedules.map(schedule => (
                <div key={schedule.排程id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {new Date(schedule.到診日期).toLocaleDateString('zh-TW')}
                    </p>
                    <p className="text-sm text-gray-600">
                      {schedule.院友列表.length} 位院友預約
                    </p>
                  </div>
                  <span className="status-badge status-scheduled">預約中</span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>今日無排程</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Prescriptions */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">最近處方</h2>
            <Link 
              to="/medication" 
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              查看全部
            </Link>
          </div>
          <div className="space-y-3">
            {recentPrescriptions.length > 0 ? (
              recentPrescriptions.map(prescription => {
                const patient = patients.find(p => p.院友id === prescription.院友id);
                return (
                  <div key={prescription.處方id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Pill className="h-5 w-5 text-purple-600" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{patient?.中文姓名}</p>
                      <p className="text-sm text-gray-600">{prescription.藥物名稱}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(prescription.處方日期).toLocaleDateString('zh-TW')}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Pill className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>暫無處方記錄</p>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Follow-ups */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">近期覆診</h2>
            <Link 
              to="/follow-up" 
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              查看全部
            </Link>
          </div>
          <div className="space-y-3">
            {upcomingFollowUps.length > 0 ? (
              upcomingFollowUps.map(appointment => {
                const patient = patients.find(p => p.院友id === appointment.院友id);
                return (
                  <div key={appointment.覆診id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <CalendarCheck className="h-5 w-5 text-indigo-600" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{patient?.中文姓名}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(appointment.覆診日期).toLocaleDateString('zh-TW')} 
                        {appointment.覆診時間 && ` ${appointment.覆診時間}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {appointment.覆診地點} - {appointment.覆診專科}
                      </p>
                    </div>
                    <span className="status-badge status-scheduled">待覆診</span>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CalendarCheck className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>近期無覆診安排</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">快速操作</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link 
            to="/scheduling" 
            className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Calendar className="h-8 w-8 text-blue-600" />
            <div>
              <p className="font-medium text-gray-900">新增排程</p>
              <p className="text-sm text-gray-600">安排醫生到診</p>
            </div>
          </Link>
          <Link 
            to="/follow-up" 
            className="flex items-center space-x-3 p-4 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            <CalendarCheck className="h-8 w-8 text-indigo-600" />
            <div>
              <p className="font-medium text-gray-900">覆診管理</p>
              <p className="text-sm text-gray-600">安排院友覆診</p>
            </div>
          </Link>
          <Link 
            to="/medication" 
            className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            <Pill className="h-8 w-8 text-green-600" />
            <div>
              <p className="font-medium text-gray-900">藥物登記</p>
              <p className="text-sm text-gray-600">掃描藥物標籤</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;