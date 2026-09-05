import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  FileCheck,
  FolderOpen,
  CalendarCheck,
  FileText,
  Download,
  BarChart3,
  HelpCircle,
  Settings,
  GraduationCap,
  X,
  MessageSquare,
  Award,
  ShieldCheck,
  ClipboardCheck,
  Building } from
'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
interface SidebarProps {
  userRole: string;
  learnerProfilePath?: string;
  isCollapsed: boolean;
  toggleCollapse: () => void;
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}
export function Sidebar({
  userRole,
  learnerProfilePath,
  isCollapsed,
  toggleCollapse,
  isMobile = false,
  isOpen = false,
  onClose
}: SidebarProps) {
  void toggleCollapse;

  const getNavItems = (role: string, profilePath: string) => {
    // Admin Navigation Structure matching screenshots
    if (role === 'Admin') {
      return [
      {
        section: 'MAIN',
        items: [
        {
          name: 'Dashboard',
          icon: <LayoutDashboard size={20} />,
          path: '/dashboard'
        },
        {
          name: 'Programmes',
          icon: <FolderOpen size={20} />,
          path: '/programmes'
        },
        {
          name: 'Learners',
          icon: <Users size={20} />,
          path: '/learners'
        },
        {
          name: 'Facilitators',
          icon: <UserCheck size={20} />,
          path: '/facilitators'
        },
        {
          name: 'Assessments',
          icon: <FileCheck size={20} />,
          path: '/assessments'
        },
        {
          name: 'Assessment Instruments',
          icon: <FileCheck size={20} />,
          path: '/facilitator-assessments'
        },
        {
          name: 'Materials',
          icon: <FolderOpen size={20} />,
          path: '/materials'
        },
        {
          name: 'Attendance',
          icon: <CalendarCheck size={20} />,
          path: '/attendance'
        },
        {
          name: 'Certificates',
          icon: <Award size={20} />,
          path: '/certificates'
        }]

      },
      {
        section: 'COMPLIANCE',
        items: [
        {
          name: 'Compliance',
          icon: <ShieldCheck size={20} />,
          path: '/compliance'
        },
        {
          name: 'Audit',
          icon: <ClipboardCheck size={20} />,
          path: '/audit'
        },
        {
          name: 'SETA Reports',
          icon: <FileText size={20} />,
          path: '/reports'
        },
        {
          name: 'SETA Exports',
          icon: <Download size={20} />,
          path: '/seta-exports'
        }]

      },
      {
        section: 'MANAGEMENT',
        items: [
        {
          name: 'User Management',
          icon: <Users size={20} />,
          path: '/users'
        },
        {
          name: 'Messaging',
          icon: <MessageSquare size={20} />,
          path: '/messages'
        },
        {
          name: 'Settings',
          icon: <Settings size={20} />,
          path: '/settings'
        }]

      }];

    }
    if (role === 'QA Officer') {
      return [
      {
        section: 'MAIN',
        items: [
        {
          name: 'QA Workspace',
          icon: <ShieldCheck size={20} />,
          path: '/qa-dashboard'
        },
        {
          name: 'Compliance',
          icon: <ShieldCheck size={20} />,
          path: '/compliance'
        },
        {
          name: 'Learners',
          icon: <Users size={20} />,
          path: '/learners'
        },
        {
          name: 'Audit',
          icon: <ClipboardCheck size={20} />,
          path: '/audit'
        },
        {
          name: 'Reports',
          icon: <BarChart3 size={20} />,
          path: '/reports'
        }]

      },
      {
        section: 'WORK',
        items: [
        {
          name: 'Messaging',
          icon: <MessageSquare size={20} />,
          path: '/messages'
        },
        {
          name: 'Settings',
          icon: <Settings size={20} />,
          path: '/settings'
        }]

      }];

    }
    // Other roles
    const common = [
    {
      name: 'Dashboard',
      icon: <LayoutDashboard size={20} />,
      path: '/dashboard'
    }];

    if (role === 'Learner') {
      return [
      {
        section: 'MAIN',
        items: [
        {
          name: 'Dashboard',
          icon: <LayoutDashboard size={20} />,
          path: '/learner-dashboard'
        },
        {
          name: 'My Courses',
          icon: <FolderOpen size={20} />,
          path: '/learner-courses'
        },
        {
          name: 'Assessments',
          icon: <FileCheck size={20} />,
          path: '/learner-assessments'
        },
        {
          name: 'Certificates',
          icon: <Award size={20} />,
          path: '/learner-certificates'
        },
        {
          name: 'Schedule',
          icon: <CalendarCheck size={20} />,
          path: '/attendance'
        },
        {
          name: 'Documents',
          icon: <FileText size={20} />,
          path: '/materials'
        },
        {
          name: 'Messages',
          icon: <MessageSquare size={20} />,
          path: '/messages'
        },
        {
          name: 'Profile',
          icon: <Users size={20} />,
          path: profilePath
        }]

      }];

    }
    if (role === 'Facilitator') {
      return [
      {
        section: 'MAIN',
        items: [
        {
          name: 'Dashboard',
          icon: <LayoutDashboard size={20} />,
          path: '/facilitator-dashboard'
        },
        {
          name: 'Learners',
          icon: <Users size={20} />,
          path: '/facilitator-learners'
        },
        {
          name: 'Training Materials',
          icon: <FolderOpen size={20} />,
          path: '/facilitator-training-materials'
        },
        {
          name: 'Assessments',
          icon: <FileCheck size={20} />,
          path: '/facilitator-assessments'
        },
        {
          name: 'Progress Reports',
          icon: <BarChart3 size={20} />,
          path: '/facilitator-progress-reports'
        },
        {
          name: 'SETA Compliance',
          icon: <ShieldCheck size={20} />,
          path: '/facilitator-seta-compliance'
        },
        {
          name: 'Communication',
          icon: <MessageSquare size={20} />,
          path: '/facilitator-communication'
        },
        {
          name: 'Settings',
          icon: <Settings size={20} />,
          path: '/settings'
        }]

      }];

    }
    if (role === 'Assessor') {
      return [
      {
        section: 'MAIN',
        items: [
        {
          name: 'Dashboard',
          icon: <LayoutDashboard size={20} />,
          path: '/assessor-dashboard'
        },
        {
          name: 'Assigned Programmes',
          icon: <FolderOpen size={20} />,
          path: '/programmes'
        },
        {
          name: 'Messages',
          icon: <MessageSquare size={20} />,
          path: '/messages'
        },
        {
          name: 'Settings',
          icon: <Settings size={20} />,
          path: '/settings'
        }]

      }];

    }
    if (role === 'Moderator') {
      return [
      {
        section: 'MAIN',
        items: [
        {
          name: 'Dashboard',
          icon: <LayoutDashboard size={20} />,
          path: '/moderator-dashboard'
        },
        {
          name: 'Assigned Programmes',
          icon: <FolderOpen size={20} />,
          path: '/programmes'
        },
        {
          name: 'Messages',
          icon: <MessageSquare size={20} />,
          path: '/messages'
        },
        {
          name: 'Settings',
          icon: <Settings size={20} />,
          path: '/settings'
        }]

      }];

    }
    if (role === 'Workplace Mentor') {
      return [
      {
        section: 'MAIN',
        items: [
        {
          name: 'Dashboard',
          icon: <LayoutDashboard size={20} />,
          path: '/workplace-mentor-dashboard'
        },
        {
          name: 'My Learners',
          icon: <Users size={20} />,
          path: '/facilitator-learners'
        },
        {
          name: 'Workplace Materials',
          icon: <FolderOpen size={20} />,
          path: '/materials'
        },
        {
          name: 'Messages',
          icon: <MessageSquare size={20} />,
          path: '/messages'
        }]

      }];

    }
    if (role === 'SETA Official') {
      return [
      {
        section: 'MAIN',
        items: [
        {
          name: 'Audit Dashboard',
          icon: <ClipboardCheck size={20} />,
          path: '/audit'
        },
        {
          name: 'Funded Programmes',
          icon: <Building size={20} />,
          path: '/seta-funded-programmes',
          badge: 'New'
        },
        {
          name: 'Compliance',
          icon: <ShieldCheck size={20} />,
          path: '/compliance'
        },
        {
          name: 'Reports',
          icon: <FileText size={20} />,
          path: '/reports'
        },
        {
          name: 'SETA Exports',
          icon: <Download size={20} />,
          path: '/seta-exports'
        },
        {
          name: 'Settings',
          icon: <Settings size={20} />,
          path: '/settings'
        }]

      }];

    }
    return [
    {
      section: 'MAIN',
      items: [...common]
    }];

  };
  const navGroups = getNavItems(
    userRole,
    learnerProfilePath ?? '/learner-dashboard'
  );
  const SidebarContent =
  <div className="flex flex-col h-full bg-white border-r border-gray-200 text-gray-600">
      {/* Logo Area */}
      <div className="h-16 flex items-center px-6 border-b border-gray-100">
        <GraduationCap className="h-8 w-8 text-brand-navy" />
        {(!isCollapsed || isMobile) &&
      <span className="ml-3 font-bold text-lg text-brand-navy tracking-tight">
            SkillForge SA
          </span>
      }
        {isMobile &&
      <button
        onClick={onClose}
        className="ml-auto text-gray-400 hover:text-gray-600">
        
            <X size={24} />
          </button>
      }
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto">
        {navGroups.map((group, idx) =>
      <div key={idx}>
            {group.section !== 'MAIN' && (!isCollapsed || isMobile) &&
        <div className="px-2 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {group.section}
              </div>
        }
            <div className="space-y-1">
              {group.items.map((item) =>
          <NavLink
            key={item.name}
            to={item.path}
            onClick={() => isMobile && onClose && onClose()}
            className={({ isActive }) => `
                    flex items-center px-2 py-2 rounded-md transition-colors text-sm font-medium
                    ${isActive ? 'bg-brand-navy/5 text-brand-navy' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                  `}>
            
                  <span
              className={`flex-shrink-0 ${isCollapsed && !isMobile ? 'mx-auto' : 'mr-3'}`}>
              
                    {item.icon}
                  </span>
                  {(!isCollapsed || isMobile) &&
            <span className="flex-1">{item.name}</span>
            }
                  {(!isCollapsed || isMobile) && item.badge &&
            <span className="ml-auto bg-brand-navy text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                      {item.badge}
                    </span>
            }
                </NavLink>
          )}
            </div>
          </div>
      )}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-gray-100 space-y-1">
        <NavLink
        to="/help"
        className="flex items-center px-2 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-md">
        
          <HelpCircle
          size={20}
          className={`flex-shrink-0 ${isCollapsed && !isMobile ? 'mx-auto' : 'mr-3'}`} />
        
          {(!isCollapsed || isMobile) && <span>Help and Support</span>}
        </NavLink>
        <NavLink
        to="/settings"
        className="flex items-center px-2 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-md">
        
          <Settings
          size={20}
          className={`flex-shrink-0 ${isCollapsed && !isMobile ? 'mx-auto' : 'mr-3'}`} />
        
          {(!isCollapsed || isMobile) && <span>Settings</span>}
        </NavLink>
      </div>
    </div>;

  if (isMobile) {
    return (
      <AnimatePresence>
        {isOpen &&
        <>
            <motion.div
            initial={{
              opacity: 0
            }}
            animate={{
              opacity: 1
            }}
            exit={{
              opacity: 0
            }}
            onClick={onClose}
            className="fixed inset-0 bg-gray-900/50 z-40 backdrop-blur-sm" />
          
            <motion.div
            initial={{
              x: '-100%'
            }}
            animate={{
              x: 0
            }}
            exit={{
              x: '-100%'
            }}
            transition={{
              type: 'spring',
              damping: 25,
              stiffness: 200
            }}
            className="fixed inset-y-0 left-0 w-64 z-50 shadow-xl">
            
              {SidebarContent}
            </motion.div>
          </>
        }
      </AnimatePresence>);

  }
  return (
    <motion.div
      className={`hidden md:flex flex-col h-screen transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}
      initial={false}
      animate={{
        width: isCollapsed ? 80 : 256
      }}>
      
      {SidebarContent}
    </motion.div>);

}
