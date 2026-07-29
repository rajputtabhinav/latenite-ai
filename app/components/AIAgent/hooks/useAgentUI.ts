import { useState } from 'react'
import { AGENT_CONFIG } from '../../../lib/constants/agent-config'
import type { TimelineEvent } from '../TaskTimeline'

export function useAgentUI() {
    // Dimensions
    const [width, setWidth] = useState<number>(AGENT_CONFIG.PANEL_WIDTH || 400)
    const [isResizing, setIsResizing] = useState(false)

    // Visibility Toggles
    const [showModelSelector, setShowModelSelector] = useState(false)
    const [showHamburgerMenu, setShowHamburgerMenu] = useState(false)
    const [showToolsDropdown, setShowToolsDropdown] = useState(false)
    const [showModelsDropdown, setShowModelsDropdown] = useState(false)
    const [showDocumentPreview, setShowDocumentPreview] = useState(false)
    const [showTaskTimeline, setShowTaskTimeline] = useState<string | null>(null)

    // UI-specific Data
    const [taskTimelineEvents, setTaskTimelineEvents] = useState<TimelineEvent[]>([])

    return {
        width, setWidth,
        isResizing, setIsResizing,
        showModelSelector, setShowModelSelector,
        showHamburgerMenu, setShowHamburgerMenu,
        showToolsDropdown, setShowToolsDropdown,
        showModelsDropdown, setShowModelsDropdown,
        showDocumentPreview, setShowDocumentPreview,
        showTaskTimeline, setShowTaskTimeline,
        taskTimelineEvents, setTaskTimelineEvents
    }
}
