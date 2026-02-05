import { useState } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/utils'
import { ThemeMode } from '../../ThemeContext'
import { HeaderActions } from './Actions'
import { AppLogo } from './AppLogo'
import { DataStatusIndicator } from './DataStatusIndicator'
import { MobileMenuButton } from './MobileMenuButton'
import { DesktopNav, MobileNav } from './Navigation'
import {
  GoogleUserProfile,
  MicrosoftUserProfile,
  MobileGoogleProfile,
  MobileMicrosoftProfile,
} from './UserProfile'

interface GoogleUser {
  name?: string
  email?: string
  picture?: string
}

interface MicrosoftAccount {
  name?: string
  username?: string
}

interface HeaderProps {
  hasData: boolean
  themeMode: ThemeMode
  busyState: { isBusy: boolean; label?: string }
  lastUpdated: number | string | null
  dataSource: string | null
  warnings: unknown[]
  hasUnsyncedChanges: boolean
  googleUser: GoogleUser | null
  googleLogout: () => void
  msEnabled: boolean
  msIsSignedIn: boolean
  msAccount: MicrosoftAccount | null | undefined
  msLogin: () => void
  msLogout: () => void
}

export function Header({
  hasData,
  themeMode: _themeMode,
  busyState,
  lastUpdated,
  dataSource,
  warnings,
  hasUnsyncedChanges,
  googleUser,
  googleLogout,
  msEnabled,
  msIsSignedIn,
  msAccount,
  msLogin,
  msLogout,
}: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <header
      className={cn(
        'border-b sticky top-0 z-50 transition-colors duration-500',
        'bg-slate-50 dark:bg-gray-900 border-slate-200 dark:border-gray-700',
      )}
    >
      <div className="w-full px-3 sm:px-4 lg:px-6">
        <div className="flex justify-between h-16">
          {/* Left Section: Logo and Navigation */}
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link
                to="/dashboard"
                className="focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-md"
              >
                <AppLogo />
              </Link>
            </div>
            <DesktopNav />
          </div>

          {/* Right Section: Status, Actions and User Profile */}
          <div className="flex items-center gap-3">
            <DataStatusIndicator hasData={hasData} />

            <HeaderActions
              busyState={busyState}
              lastUpdated={lastUpdated}
              dataSource={dataSource}
              warningCount={warnings.length}
              hasUnsyncedChanges={hasUnsyncedChanges}
            />

            <div className="flex items-center gap-3">
              {googleUser && <GoogleUserProfile user={googleUser} onLogout={googleLogout} />}

              {msEnabled && (
                <MicrosoftUserProfile
                  isSignedIn={msIsSignedIn}
                  account={msAccount}
                  onLogin={msLogin}
                  onLogout={msLogout}
                />
              )}

              <MobileMenuButton
                onClick={() => setIsMobileMenuOpen((isOpen) => isOpen === false)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <MobileNav isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

      {/* Mobile User Profiles */}
      {isMobileMenuOpen && googleUser && (
        <MobileGoogleProfile
          user={googleUser}
          onLogout={googleLogout}
          onClose={() => setIsMobileMenuOpen(false)}
        />
      )}

      {isMobileMenuOpen && msEnabled && (
        <MobileMicrosoftProfile
          isSignedIn={msIsSignedIn}
          account={msAccount}
          onLogin={msLogin}
          onLogout={msLogout}
          onClose={() => setIsMobileMenuOpen(false)}
        />
      )}
    </header>
  )
}

