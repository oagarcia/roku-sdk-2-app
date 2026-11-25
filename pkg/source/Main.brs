' Copyright (c) 2026 Roku, Inc.
' SPDX-License-Identifier: MIT

sub Main()
    screen = CreateObject("roSGScreen")
    m.port = CreateObject("roMessagePort")
    screen.setMessagePort(m.port)

    ' The Exit button sets MyFirstApp.exitApp; BaseAppScene forwards it to m.global.exitApp,
    ' which is observed here so the main loop can return and close the app.
    m.global = screen.getGlobalNode()
    m.global.addFields({ exitApp: false })
    m.global.observeField("exitApp", m.port)

    scene = screen.CreateScene("BaseAppScene")
    screen.show()

    while(true)
        msg = wait(0, m.port)
        msgType = type(msg)
        if msgType = "roSGScreenEvent"
            if msg.isScreenClosed() then return
        else if msgType = "roSGNodeEvent"
            if msg.getField() = "exitApp" and msg.getData() = true then return
        else
            print "Unhandled message type: "; msgType
        end if
    end while
end sub
