Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

try {
    Add-Type -Name Window -Namespace Console -MemberDefinition '
    [DllImport("Kernel32.dll")]
    public static extern IntPtr GetConsoleWindow();

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, Int32 nCmdShow);
    ' -ErrorAction SilentlyContinue

    $hwnd = [Console.Window]::GetConsoleWindow()
    if ($hwnd -ne [IntPtr]::Zero) {
        [Console.Window]::ShowWindow($hwnd, 0) | Out-Null
    }
} catch {}

# Single-Instance Mutex (evita múltiplas instâncias concorrentes da HUD)
$script:hudMutex = New-Object System.Threading.Mutex($false, "Global\PokeIdle_Cluster_HUD_Mutex")
if (-not $script:hudMutex.WaitOne(0, $false)) {
    # Outra instância da HUD já está em execução no sistema
    exit
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$historyFile = Join-Path $projectRoot "data\game_history.json"
$eventsFile = Join-Path $projectRoot "data\live_events.json"

$emojiFire = [char]::ConvertFromUtf32(0x1F525)
$emojiHerb = [char]::ConvertFromUtf32(0x1F33F)
$emojiCoin = [char]::ConvertFromUtf32(0x1FA99)
$emojiTarget = [char]::ConvertFromUtf32(0x1F3AF)
$emojiSword = [char]::ConvertFromUtf32(0x2694)


[xml]$xaml = @"
<Window 
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
    Title="Pokéidle Cluster HUD" 
    Width="365" 
    SizeToContent="Height"
    WindowStyle="None" 
    AllowsTransparency="True" 
    Background="Transparent" 
    Topmost="True" 
    ShowInTaskbar="True"
    WindowStartupLocation="CenterScreen">
    
    <Border Background="#F00F172A" BorderBrush="#4064748B" BorderThickness="1" CornerRadius="14" Margin="5">
        <Border.Effect>
            <DropShadowEffect Color="#000000" BlurRadius="18" ShadowDepth="4" Opacity="0.6"/>
        </Border.Effect>

        <Grid Margin="0">
            <Grid.RowDefinitions>
                <RowDefinition Height="Auto"/>
                <RowDefinition Height="*"/>
            </Grid.RowDefinitions>

            <!-- Header / Drag Bar -->
            <Border Grid.Row="0" Name="HeaderBar" Background="#F01E293B" CornerRadius="13,13,0,0" Padding="12,9" Cursor="SizeAll">
                <Grid>
                    <Grid.ColumnDefinitions>
                        <ColumnDefinition Width="*"/>
                        <ColumnDefinition Width="Auto"/>
                    </Grid.ColumnDefinitions>

                    <StackPanel Orientation="Horizontal" Grid.Column="0" VerticalAlignment="Center">
                        <Ellipse Width="8" Height="8" Fill="#22C55E" Margin="0,0,7,0"/>
                        <TextBlock Text="POKÉIDLE CLUSTER HUD" FontWeight="Bold" FontSize="11" Foreground="#F8FAFC"/>
                    </StackPanel>

                    <StackPanel Orientation="Horizontal" Grid.Column="1">
                        <Button Name="BtnPin" Content="📌" Width="24" Height="20" Background="Transparent" Foreground="#FACC15" BorderThickness="0" Cursor="Hand" ToolTip="Fixar ou desafixar no topo" Margin="0,0,2,0" FontSize="10"/>
                        <Button Name="BtnMin" Content="—" Width="22" Height="20" Background="Transparent" Foreground="#CBD5E1" FontWeight="Bold" BorderThickness="0" Cursor="Hand" ToolTip="Minimizar para a Bandeja (Ícones Ocultos)" Margin="0,0,2,0"/>
                        <Button Name="BtnClose" Content="✕" Width="22" Height="20" Background="Transparent" Foreground="#EF4444" FontWeight="Bold" BorderThickness="0" Cursor="Hand" ToolTip="Ocultar para a Bandeja (Ícones Ocultos)"/>
                    </StackPanel>
                </Grid>
            </Border>

            <!-- Content Area -->
            <Grid Grid.Row="1" Margin="10,8,10,10">
                <!-- VIEW 1: SUMMARY / ACCOUNT SELECTION -->
                <StackPanel Name="ViewSummary" Visibility="Visible">
                    <!-- Total Balance -->
                    <Border Background="#A0020617" BorderBrush="#30FACC15" BorderThickness="1" CornerRadius="8" Padding="10,6" Margin="0,0,0,8">
                        <Grid>
                            <Grid.ColumnDefinitions>
                                <ColumnDefinition Width="*"/>
                                <ColumnDefinition Width="Auto"/>
                            </Grid.ColumnDefinitions>
                            <StackPanel Grid.Column="0">
                                <TextBlock Text="SALDO CONSOLIDADO (2 CONTAS)" FontSize="9" FontWeight="Bold" Foreground="#94A3B8"/>
                                <StackPanel Orientation="Horizontal" Margin="0,2,0,0">
                                    <TextBlock Name="TxtTotalCoins" Text="Carregando..." FontSize="16" FontWeight="ExtraBold" Foreground="#FACC15"/>
                                    <TextBlock Text=" 🪙" FontSize="12" VerticalAlignment="Center" Margin="3,0,0,0"/>
                                </StackPanel>
                            </StackPanel>
                            <StackPanel Grid.Column="1" HorizontalAlignment="Right" VerticalAlignment="Center">
                                <TextBlock Text="RENDIMENTO MÉDIO" FontSize="8" FontWeight="Bold" Foreground="#4ADE80" HorizontalAlignment="Right"/>
                                <TextBlock Text="~76.000 Coins/h" FontSize="10" FontWeight="SemiBold" Foreground="#E2E8F0" HorizontalAlignment="Right"/>
                            </StackPanel>
                        </Grid>
                    </Border>

                    <!-- Account 1 Clickable Card -->
                    <Border Name="CardAcc1" Background="#601E293B" BorderBrush="#40EF4444" BorderThickness="1" CornerRadius="8" Padding="8" Margin="0,0,0,6" Cursor="Hand">
                        <Grid>
                            <Grid.ColumnDefinitions>
                                <ColumnDefinition Width="42"/>
                                <ColumnDefinition Width="*"/>
                                <ColumnDefinition Width="Auto"/>
                            </Grid.ColumnDefinitions>
                            <Image Name="ImgAcc1Poke" Grid.Column="0" Width="38" Height="38" Source="https://play.pokemonshowdown.com/sprites/gen5/charmander.png" RenderOptions.BitmapScalingMode="NearestNeighbor" VerticalAlignment="Center"/>
                            <StackPanel Grid.Column="1" Margin="6,0,0,0" VerticalAlignment="Center">
                                <StackPanel Orientation="Horizontal">
                                    <TextBlock Name="TxtAcc1Nick" Text="👤 Conta 1" FontWeight="Bold" FontSize="11" Foreground="#F87171"/>
                                    <TextBlock Name="TxtAcc1Trainer" Text=" · Nível --" FontSize="9" Foreground="#94A3B8" VerticalAlignment="Center"/>
                                </StackPanel>
                                <TextBlock Name="TxtAcc1Poke" Text="🔥 Charmander Nv. --" FontSize="10" Foreground="#F1F5F9" FontWeight="SemiBold" Margin="0,1,0,1"/>
                                <TextBlock Name="TxtAcc1Hunt" Text="Área: Paras · nível 1 · 🎯 Catcher Ativo" FontSize="8" Foreground="#38BDF8"/>
                            </StackPanel>
                            <StackPanel Grid.Column="2" VerticalAlignment="Center" HorizontalAlignment="Right">
                                <TextBlock Name="TxtAcc1Coins" Text="-- 🪙" FontSize="11" FontWeight="Bold" Foreground="#FDE047" HorizontalAlignment="Right"/>
                                <TextBlock Text="Ver detalhes ›" FontSize="8" Foreground="#60A5FA" HorizontalAlignment="Right" Margin="0,2,0,0"/>
                            </StackPanel>
                        </Grid>
                    </Border>

                    <!-- Account 2 Clickable Card -->
                    <Border Name="CardAcc2" Background="#601E293B" BorderBrush="#4022C55E" BorderThickness="1" CornerRadius="8" Padding="8" Margin="0,0,0,8" Cursor="Hand">
                        <Grid>
                            <Grid.ColumnDefinitions>
                                <ColumnDefinition Width="42"/>
                                <ColumnDefinition Width="*"/>
                                <ColumnDefinition Width="Auto"/>
                            </Grid.ColumnDefinitions>
                            <Image Name="ImgAcc2Poke" Grid.Column="0" Width="38" Height="38" Source="https://play.pokemonshowdown.com/sprites/gen5/bulbasaur.png" RenderOptions.BitmapScalingMode="NearestNeighbor" VerticalAlignment="Center"/>
                            <StackPanel Grid.Column="1" Margin="6,0,0,0" VerticalAlignment="Center">
                                <StackPanel Orientation="Horizontal">
                                    <TextBlock Name="TxtAcc2Nick" Text="👤 Conta 2" FontWeight="Bold" FontSize="11" Foreground="#4ADE80"/>
                                    <TextBlock Name="TxtAcc2Trainer" Text=" · Nível --" FontSize="9" Foreground="#94A3B8" VerticalAlignment="Center"/>
                                </StackPanel>
                                <TextBlock Name="TxtAcc2Poke" Text="🌿 Bulbasaur Nv. --" FontSize="10" Foreground="#F1F5F9" FontWeight="SemiBold" Margin="0,1,0,1"/>
                                <TextBlock Name="TxtAcc2Hunt" Text="Área: Geodude · nível 1 · 🎯 Catcher Ativo" FontSize="8" Foreground="#38BDF8"/>
                            </StackPanel>
                            <StackPanel Grid.Column="2" VerticalAlignment="Center" HorizontalAlignment="Right">
                                <TextBlock Name="TxtAcc2Coins" Text="-- 🪙" FontSize="11" FontWeight="Bold" Foreground="#FDE047" HorizontalAlignment="Right"/>
                                <TextBlock Text="Ver detalhes ›" FontSize="8" Foreground="#60A5FA" HorizontalAlignment="Right" Margin="0,2,0,0"/>
                            </StackPanel>
                        </Grid>
                    </Border>

                    <!-- Section: Last Hour Highlights -->
                    <Border Background="#400F172A" BorderBrush="#2094A3B8" BorderThickness="1" CornerRadius="8" Padding="8,6" Margin="0,0,0,6">
                        <StackPanel>
                            <Grid Margin="0,0,0,4">
                                <StackPanel Orientation="Horizontal">
                                    <TextBlock Text="⭐ DESTAQUES DA ÚLTIMA HORA" FontSize="9" FontWeight="Bold" Foreground="#38BDF8"/>
                                    <Border Background="#2038BDF8" CornerRadius="4" Padding="4,1" Margin="4,0,0,0">
                                        <TextBlock Name="TxtHighlightsCount" Text="0 eventos" FontSize="8" Foreground="#38BDF8" FontWeight="SemiBold"/>
                                    </Border>
                                </StackPanel>
                                <TextBlock Text="Tempo Real ⚡" FontSize="8" Foreground="#4ADE80" HorizontalAlignment="Right"/>
                            </Grid>
                            
                            <!-- Dynamic Highlights List Container -->
                            <StackPanel Name="ListHighlights">
                                <TextBlock Text="Aguardando eventos recentes..." FontSize="8" Foreground="#64748B"/>
                            </StackPanel>
                        </StackPanel>
                    </Border>

                    <!-- Footer Status -->
                    <Grid Margin="2,2,2,0">
                        <TextBlock Name="TxtStatus" Text="● Cluster Operando em Tempo Real" FontSize="8" Foreground="#22C55E"/>
                        <TextBlock Name="TxtLastUpdate" Text="Sincronizado" FontSize="8" Foreground="#64748B" HorizontalAlignment="Right"/>
                    </Grid>
                </StackPanel>

                <!-- VIEW 2: ACCOUNT DETAIL (EXPANDED) -->
                <StackPanel Name="ViewDetail" Visibility="Collapsed">
                    <!-- Back Button Header -->
                    <Grid Margin="0,0,0,8">
                        <Button Name="BtnBackToSummary" Background="#2038BDF8" BorderBrush="#6038BDF8" BorderThickness="1" Cursor="Hand" Padding="8,4" HorizontalAlignment="Left">
                            <TextBlock Text="‹ Voltar ao Cluster" FontSize="10" FontWeight="Bold" Foreground="#38BDF8"/>
                        </Button>
                        <TextBlock Name="TxtDetailTitle" Text="Detalhes da Conta" FontSize="11" FontWeight="Bold" Foreground="#F8FAFC" HorizontalAlignment="Right" VerticalAlignment="Center"/>
                    </Grid>

                    <!-- Active Pokemon Big Card -->
                    <Border Background="#601E293B" BorderBrush="#5038BDF8" BorderThickness="1" CornerRadius="10" Padding="10" Margin="0,0,0,8">
                        <Grid>
                            <Grid.ColumnDefinitions>
                                <ColumnDefinition Width="68"/>
                                <ColumnDefinition Width="*"/>
                            </Grid.ColumnDefinitions>
                            
                            <Border Grid.Column="0" Background="#30000000" CornerRadius="8" Padding="4" VerticalAlignment="Center" HorizontalAlignment="Left">
                                <Image Name="ImgDetailPoke" Width="58" Height="58" Source="https://play.pokemonshowdown.com/sprites/gen5/charmander.png" RenderOptions.BitmapScalingMode="NearestNeighbor"/>
                            </Border>

                            <StackPanel Grid.Column="1" Margin="8,0,0,0">
                                <Grid>
                                    <TextBlock Name="TxtDetailPokeName" Text="🔥 Charmander" FontSize="13" FontWeight="Bold" Foreground="#F8FAFC"/>
                                    <TextBlock Name="TxtDetailPokeLv" Text="Nv. 18" FontSize="12" FontWeight="Bold" Foreground="#FACC15" HorizontalAlignment="Right"/>
                                </Grid>

                                <StackPanel Orientation="Horizontal" Margin="0,3,0,4">
                                    <Border Background="#40EF4444" CornerRadius="3" Padding="4,1" Margin="0,0,3,0">
                                        <TextBlock Name="TxtDetailPower" Text="⚔️ Poder 53" FontSize="8" FontWeight="Bold" Foreground="#FCA5A5"/>
                                    </Border>
                                    <Border Background="#403B82F6" CornerRadius="3" Padding="4,1" Margin="0,0,3,0">
                                        <TextBlock Text="P2 · IV 162" FontSize="8" FontWeight="SemiBold" Foreground="#93C5FD"/>
                                    </Border>
                                    <Border Background="#40A855F7" CornerRadius="3" Padding="4,1">
                                        <TextBlock Text="Q 1,600 · Nota 3,14" FontSize="8" FontWeight="SemiBold" Foreground="#D8B4FE"/>
                                    </Border>
                                </StackPanel>

                                <!-- HP Bar -->
                                <Grid Margin="0,2,0,2">
                                    <ProgressBar Name="PbDetailHp" Height="6" Value="95" Maximum="100" Background="#30000000" Foreground="#22C55E" BorderThickness="0"/>
                                </Grid>
                                <TextBlock Name="TxtDetailHpVal" Text="HP: 278 / 324" FontSize="8" Foreground="#94A3B8" HorizontalAlignment="Right"/>

                                <!-- XP Bar -->
                                <Grid Margin="0,2,0,2">
                                    <ProgressBar Name="PbDetailXp" Height="5" Value="26" Maximum="100" Background="#30000000" Foreground="#38BDF8" BorderThickness="0"/>
                                </Grid>
                                <TextBlock Name="TxtDetailXpVal" Text="XP: 971 / 13.700" FontSize="8" Foreground="#94A3B8" HorizontalAlignment="Right"/>
                            </StackPanel>
                        </Grid>
                    </Border>

                    <!-- Account Operational Stats Grid -->
                    <Border Background="#400F172A" BorderBrush="#2094A3B8" BorderThickness="1" CornerRadius="8" Padding="8" Margin="0,0,0,8">
                        <Grid>
                            <Grid.RowDefinitions>
                                <RowDefinition Height="Auto"/>
                                <RowDefinition Height="Auto"/>
                                <RowDefinition Height="Auto"/>
                            </Grid.RowDefinitions>
                            <Grid.ColumnDefinitions>
                                <ColumnDefinition Width="*"/>
                                <ColumnDefinition Width="*"/>
                            </Grid.ColumnDefinitions>

                            <StackPanel Grid.Row="0" Grid.Column="0" Margin="0,0,0,6">
                                <TextBlock Text="SALDO DA CONTA" FontSize="8" FontWeight="Bold" Foreground="#94A3B8"/>
                                <TextBlock Name="TxtDetailCoins" Text="-- 🪙" FontSize="12" FontWeight="Bold" Foreground="#FDE047"/>
                            </StackPanel>

                            <StackPanel Grid.Row="0" Grid.Column="1" Margin="0,0,0,6">
                                <TextBlock Text="NÍVEL DO TREINADOR" FontSize="8" FontWeight="Bold" Foreground="#94A3B8"/>
                                <TextBlock Name="TxtDetailTrainerLv" Text="Nível --" FontSize="10" FontWeight="SemiBold" Foreground="#E2E8F0"/>
                            </StackPanel>

                            <StackPanel Grid.Row="1" Grid.Column="0" Margin="0,0,0,6">
                                <TextBlock Text="ÁREA DE CAÇA" FontSize="8" FontWeight="Bold" Foreground="#94A3B8"/>
                                <TextBlock Name="TxtDetailHunt" Text="--" FontSize="10" FontWeight="SemiBold" Foreground="#38BDF8"/>
                            </StackPanel>

                            <StackPanel Grid.Row="1" Grid.Column="1" Margin="0,0,0,6">
                                <TextBlock Text="AUTO-CATCHER SELETIVO" FontSize="8" FontWeight="Bold" Foreground="#94A3B8"/>
                                <TextBlock Text="🎯 32 Alvos + Shinies" FontSize="9" FontWeight="SemiBold" Foreground="#4ADE80"/>
                            </StackPanel>

                            <StackPanel Grid.Row="2" Grid.Column="0">
                                <TextBlock Text="MORTES / HORA" FontSize="8" FontWeight="Bold" Foreground="#94A3B8"/>
                                <TextBlock Text="0 mortes (100% Estável)" FontSize="9" FontWeight="SemiBold" Foreground="#22C55E"/>
                            </StackPanel>

                            <StackPanel Grid.Row="2" Grid.Column="1">
                                <TextBlock Text="CONEXÃO CDP" FontSize="8" FontWeight="Bold" Foreground="#94A3B8"/>
                                <TextBlock Name="TxtDetailPort" Text="Porta -- (Ativa)" FontSize="9" FontWeight="SemiBold" Foreground="#E2E8F0"/>
                            </StackPanel>
                        </Grid>
                    </Border>

                    <!-- Account Management: Logout & Password Change -->
                    <Border Background="#400F172A" BorderBrush="#3038BDF8" BorderThickness="1" CornerRadius="8" Padding="8,6" Margin="0,0,0,6">
                        <Grid>
                            <Grid.ColumnDefinitions>
                                <ColumnDefinition Width="*"/>
                                <ColumnDefinition Width="Auto"/>
                            </Grid.ColumnDefinitions>
                            
                            <Button Name="BtnAccountLogout" Content="🚪 Sair da Conta" Background="#30EF4444" BorderBrush="#60EF4444" BorderThickness="1" Foreground="#FCA5A5" FontWeight="SemiBold" FontSize="9" Padding="6,3" Cursor="Hand" ToolTip="Encerrar a sessão desta conta e remover credenciais salvas" HorizontalAlignment="Left"/>
                            
                            <StackPanel Grid.Column="1" Orientation="Horizontal" VerticalAlignment="Center">
                                <Button Name="BtnAccountChangePass" Content="🔑 Alterar Senha" Background="#3038BDF8" BorderBrush="#6038BDF8" BorderThickness="1" Foreground="#38BDF8" FontWeight="SemiBold" FontSize="9" Padding="6,3" Cursor="Hand" ToolTip="Atualizar senha da conta salva localmente"/>
                                <Button Name="BtnHelpPassword" Content="❓" Width="18" Height="18" Background="Transparent" BorderThickness="0" Foreground="#FACC15" FontWeight="Bold" FontSize="9" Cursor="Help" ToolTip="ALTERE SOMENTE SE SENHA DA CONTA FOI TROCADA" Margin="3,0,0,0"/>
                            </StackPanel>
                        </Grid>
                    </Border>

                    <!-- Account Highlights of the last hour -->
                    <Border Background="#400F172A" BorderBrush="#2094A3B8" BorderThickness="1" CornerRadius="8" Padding="8,6" Margin="0,0,0,4">
                        <StackPanel>
                            <TextBlock Text="📜 HISTÓRICO DA CONTA (ÚLTIMA 1H)" FontSize="8" FontWeight="Bold" Foreground="#94A3B8" Margin="0,0,0,4"/>
                            <StackPanel Name="ListAccountEvents">
                                <TextBlock Text="Nenhum evento registrado nesta hora." FontSize="8" Foreground="#64748B"/>
                            </StackPanel>
                        </StackPanel>
                    </Border>
                </StackPanel>

                <!-- VIEW 3: CREDENTIALS / ONBOARDING / CHANGE PASSWORD MODAL -->
                <StackPanel Name="ViewLoginModal" Visibility="Collapsed">
                    <Border Background="#F01E293B" BorderBrush="#6038BDF8" BorderThickness="1" CornerRadius="10" Padding="12,10" Margin="0,0,0,4">
                        <StackPanel>
                            <Grid Margin="0,0,0,8">
                                <TextBlock Name="TxtLoginModalTitle" Text="🔑 Gerenciar Acesso da Conta" FontSize="11" FontWeight="Bold" Foreground="#38BDF8"/>
                                <Button Name="BtnCloseLoginModal" Content="✕" Width="18" Height="18" Background="Transparent" Foreground="#94A3B8" BorderThickness="0" Cursor="Hand" HorizontalAlignment="Right"/>
                            </Grid>
                            <TextBlock Name="TxtLoginModalSubtitle" Text="Insira as credenciais de acesso ao Pokéidle.io:" FontSize="9" Foreground="#94A3B8" Margin="0,0,0,8"/>
                            
                            <TextBlock Text="USUÁRIO / E-MAIL" FontSize="8" FontWeight="Bold" Foreground="#64748B" Margin="0,0,0,2"/>
                            <TextBox Name="InputLoginUser" Height="24" Background="#30000000" Foreground="#F8FAFC" BorderBrush="#4064748B" BorderThickness="1" Padding="4,2" FontSize="10" Margin="0,0,0,8"/>

                            <StackPanel Orientation="Horizontal" Margin="0,0,0,2">
                                <TextBlock Text="SENHA DA CONTA" FontSize="8" FontWeight="Bold" Foreground="#64748B"/>
                                <TextBlock Text=" ❓" FontSize="8" Foreground="#FACC15" Cursor="Help" ToolTip="ALTERE SOMENTE SE SENHA DA CONTA FOI TROCADA" Margin="3,0,0,0"/>
                            </StackPanel>
                            <PasswordBox Name="InputLoginPass" Height="24" Background="#30000000" Foreground="#F8FAFC" BorderBrush="#4064748B" BorderThickness="1" Padding="4,2" FontSize="10" Margin="0,0,0,10"/>

                            <Grid>
                                <Grid.ColumnDefinitions>
                                    <ColumnDefinition Width="*"/>
                                    <ColumnDefinition Width="*"/>
                                </Grid.ColumnDefinitions>
                                <Button Name="BtnCancelLoginModal" Content="Cancelar" Grid.Column="0" Background="#2064748B" BorderBrush="#4064748B" BorderThickness="1" Foreground="#CBD5E1" FontSize="9" Padding="4" Margin="0,0,4,0" Cursor="Hand"/>
                                <Button Name="BtnSaveLoginModal" Content="Salvar Credencial" Grid.Column="1" Background="#22C55E" BorderThickness="0" Foreground="#0F172A" FontWeight="Bold" FontSize="9" Padding="4" Margin="4,0,0,0" Cursor="Hand"/>
                            </Grid>
                        </StackPanel>
                    </Border>
                </StackPanel>
            </Grid>
        </Grid>
    </Border>
</Window>
"@

$reader = (New-Object System.Xml.XmlNodeReader $xaml)
$window = [Windows.Markup.XamlReader]::Load($reader)

# WPF Application with explicit shutdown
$app = New-Object System.Windows.Application
$app.ShutdownMode = [System.Windows.ShutdownMode]::OnExplicitShutdown

# Controls
$headerBar = $window.FindName("HeaderBar")
$btnPin = $window.FindName("BtnPin")
$btnMin = $window.FindName("BtnMin")
$btnClose = $window.FindName("BtnClose")

$viewSummary = $window.FindName("ViewSummary")
$viewDetail = $window.FindName("ViewDetail")
$btnBackToSummary = $window.FindName("BtnBackToSummary")

$txtTotalCoins = $window.FindName("TxtTotalCoins")
$cardAcc1 = $window.FindName("CardAcc1")
$txtAcc1Nick = $window.FindName("TxtAcc1Nick")
$imgAcc1Poke = $window.FindName("ImgAcc1Poke")
$txtAcc1Trainer = $window.FindName("TxtAcc1Trainer")
$txtAcc1Poke = $window.FindName("TxtAcc1Poke")
$txtAcc1Hunt = $window.FindName("TxtAcc1Hunt")
$txtAcc1Coins = $window.FindName("TxtAcc1Coins")

$cardAcc2 = $window.FindName("CardAcc2")
$txtAcc2Nick = $window.FindName("TxtAcc2Nick")
$imgAcc2Poke = $window.FindName("ImgAcc2Poke")
$txtAcc2Trainer = $window.FindName("TxtAcc2Trainer")
$txtAcc2Poke = $window.FindName("TxtAcc2Poke")
$txtAcc2Hunt = $window.FindName("TxtAcc2Hunt")
$txtAcc2Coins = $window.FindName("TxtAcc2Coins")

$txtHighlightsCount = $window.FindName("TxtHighlightsCount")
$listHighlights = $window.FindName("ListHighlights")
$txtStatus = $window.FindName("TxtStatus")
$txtLastUpdate = $window.FindName("TxtLastUpdate")

# Detail Controls
$txtDetailTitle = $window.FindName("TxtDetailTitle")
$imgDetailPoke = $window.FindName("ImgDetailPoke")
$txtDetailPokeName = $window.FindName("TxtDetailPokeName")
$txtDetailPokeLv = $window.FindName("TxtDetailPokeLv")
$txtDetailPower = $window.FindName("TxtDetailPower")
$pbDetailHp = $window.FindName("PbDetailHp")
$txtDetailHpVal = $window.FindName("TxtDetailHpVal")
$pbDetailXp = $window.FindName("PbDetailXp")
$txtDetailXpVal = $window.FindName("TxtDetailXpVal")
$txtDetailCoins = $window.FindName("TxtDetailCoins")
$txtDetailTrainerLv = $window.FindName("TxtDetailTrainerLv")
$txtDetailHunt = $window.FindName("TxtDetailHunt")
$txtDetailPort = $window.FindName("TxtDetailPort")
$listAccountEvents = $window.FindName("ListAccountEvents")

# Account Management & Login Modal Controls
$btnAccountLogout = $window.FindName("BtnAccountLogout")
$btnAccountChangePass = $window.FindName("BtnAccountChangePass")
$btnHelpPassword = $window.FindName("BtnHelpPassword")

$viewLoginModal = $window.FindName("ViewLoginModal")
$txtLoginModalTitle = $window.FindName("TxtLoginModalTitle")
$txtLoginModalSubtitle = $window.FindName("TxtLoginModalSubtitle")
$btnCloseLoginModal = $window.FindName("BtnCloseLoginModal")
$inputLoginUser = $window.FindName("InputLoginUser")
$inputLoginPass = $window.FindName("InputLoginPass")
$btnCancelLoginModal = $window.FindName("BtnCancelLoginModal")
$btnSaveLoginModal = $window.FindName("BtnSaveLoginModal")

# State
$script:selectedPort = $null
$script:latestAccounts = @()
$script:latestHighlights = @()

# Dragging
$headerBar.Add_MouseLeftButtonDown({ $window.DragMove() })

# Pin
$btnPin.Add_Click({
    $window.Topmost = -not $window.Topmost
    $btnPin.Foreground = if ($window.Topmost) { [System.Windows.Media.Brushes]::Yellow } else { [System.Windows.Media.Brushes]::Gray }
})

# ========================================================
# SYSTEM TRAY (ÍCONES OCULTOS / BANDEJA DO SISTEMA)
# ========================================================
function Get-ClusterTrayIcon {
    try {
        $bmp = New-Object System.Drawing.Bitmap 32, 32
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $g.Clear([System.Drawing.Color]::Transparent)

        $borderPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 30, 41, 59)), 2
        $redBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 239, 68, 68))
        $whiteBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 248, 250, 252))
        $blackBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 15, 23, 42))

        # Pokéball: Top half red, bottom half white
        $g.FillPie($redBrush, 2, 2, 28, 28, 180, 180)
        $g.FillPie($whiteBrush, 2, 2, 28, 28, 0, 180)
        $g.DrawEllipse($borderPen, 2, 2, 28, 28)

        # Center band
        $bandPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 15, 23, 42)), 3
        $g.DrawLine($bandPen, 2, 16, 30, 16)

        # Center button
        $g.FillEllipse($blackBrush, 11, 11, 10, 10)
        $g.FillEllipse($whiteBrush, 13, 13, 6, 6)

        $g.Dispose()
        $hIcon = $bmp.GetHicon()
        return [System.Drawing.Icon]::FromHandle($hIcon)
    } catch {
        return [System.Drawing.SystemIcons]::Application
    }
}

$notifyIcon = New-Object System.Windows.Forms.NotifyIcon
$notifyIcon.Icon = Get-ClusterTrayIcon
$notifyIcon.Text = "Pokéidle Cluster HUD (Duplo clique para abrir)"
$notifyIcon.Visible = $true

$script:ToggleHudWindow = {
    if ($window.IsVisible -and $window.WindowState -ne [System.Windows.WindowState]::Minimized) {
        $window.Hide()
    } else {
        $window.Show()
        $window.WindowState = [System.Windows.WindowState]::Normal
        $window.Activate()
        $window.Focus()
        $window.Topmost = $true
    }
}

# Double Click and Single Left Click toggle / open HUD
$notifyIcon.Add_DoubleClick({
    & $script:ToggleHudWindow
})

$notifyIcon.Add_MouseClick({
    param($sender, $e)
    if ($e.Button -eq [System.Windows.Forms.MouseButtons]::Left) {
        & $script:ToggleHudWindow
    }
})

# Context Menu on Tray Icon
$contextMenu = New-Object System.Windows.Forms.ContextMenuStrip

$itemShow = $contextMenu.Items.Add("Exibir HUD Flutuante")
$itemShow.Add_Click({
    $window.Show()
    $window.WindowState = [System.Windows.WindowState]::Normal
    $window.Activate()
    $window.Focus()
    $window.Topmost = $true
})

$itemHide = $contextMenu.Items.Add("Ocultar para a Bandeja")
$itemHide.Add_Click({
    $window.Hide()
})

$contextMenu.Items.Add("-") | Out-Null

$itemExit = $contextMenu.Items.Add("Sair do Cluster HUD")
$itemExit.Add_Click({
    $notifyIcon.Visible = $false
    $notifyIcon.Dispose()
    $window.Close()
    $app.Shutdown()
    Stop-Process -Id $PID -Force
})

$notifyIcon.ContextMenuStrip = $contextMenu

# Minimize to System Tray
$window.Add_StateChanged({
    if ($window.WindowState -eq [System.Windows.WindowState]::Minimized) {
        $window.Hide()
    }
})

# Close and Minimize buttons on the HUD window hide to System Tray instead of exiting
$btnMin.Add_Click({
    $window.Hide()
})

$btnClose.Add_Click({
    $window.Hide()
})

# Navigation: Click Account 1
$cardAcc1.Add_MouseLeftButtonDown({
    $script:selectedPort = 9222
    $viewSummary.Visibility = [System.Windows.Visibility]::Collapsed
    $viewDetail.Visibility = [System.Windows.Visibility]::Visible
    Update-DetailView
})

# Navigation: Click Account 2
$cardAcc2.Add_MouseLeftButtonDown({
    $script:selectedPort = 9223
    $viewSummary.Visibility = [System.Windows.Visibility]::Collapsed
    $viewDetail.Visibility = [System.Windows.Visibility]::Visible
    Update-DetailView
})

# Navigation: Back
$btnBackToSummary.Add_Click({
    $script:selectedPort = $null
    $viewDetail.Visibility = [System.Windows.Visibility]::Collapsed
    $viewLoginModal.Visibility = [System.Windows.Visibility]::Collapsed
    $viewSummary.Visibility = [System.Windows.Visibility]::Visible
})

# ========================================================
# ACCOUNT MANAGEMENT & CREDENTIAL CONFIGURATION
# ========================================================
$configFile = Join-Path $projectRoot "data\cluster_config.json"
$configTemplateFile = Join-Path $projectRoot "data\cluster_config.template.json"

function Get-ClusterConfig {
    if (Test-Path $configFile) {
        try {
            return Get-Content $configFile -Raw -Encoding UTF8 | ConvertFrom-Json
        } catch {}
    }
    if (Test-Path $configTemplateFile) {
        try {
            return Get-Content $configTemplateFile -Raw -Encoding UTF8 | ConvertFrom-Json
        } catch {}
    }
    return $null
}

function Save-ClusterConfig($cfg) {
    try {
        $json = $cfg | ConvertTo-Json -Depth 5
        [System.IO.File]::WriteAllText($configFile, $json, [System.Text.Encoding]::UTF8)
    } catch {}
}

# "?" Help Tooltip Click
$btnHelpPassword.Add_Click({
    [System.Windows.MessageBox]::Show(
        "ALTERE SOMENTE SE SENHA DA CONTA FOI TROCADA`n`nAo alterar a senha aqui, ela será utilizada pelo cluster nas próximas inicializações.",
        "Segurança da Conta",
        [System.Windows.MessageBoxButton]::OK,
        [System.Windows.MessageBoxImage]::Information
    ) | Out-Null
})

# Change Password Button
$btnAccountChangePass.Add_Click({
    if (-not $script:selectedPort) { return }
    $cfg = Get-ClusterConfig
    $accCfg = $null
    if ($cfg -and $cfg.accounts) {
        $accCfg = $cfg.accounts | Where-Object { $_.port -eq $script:selectedPort }
    }
    $targetNick = if ($accCfg) { $accCfg.nick } else { "Porta $($script:selectedPort)" }
    $txtLoginModalTitle.Text = "🔑 Alterar Senha — $targetNick"
    $txtLoginModalSubtitle.Text = "Atualize o login e a senha desta conta para conexões automáticas:"
    $inputLoginUser.Text = if ($accCfg -and $accCfg.email) { $accCfg.email } else { "" }
    $inputLoginPass.Password = ""
    $viewDetail.Visibility = [System.Windows.Visibility]::Collapsed
    $viewSummary.Visibility = [System.Windows.Visibility]::Collapsed
    $viewLoginModal.Visibility = [System.Windows.Visibility]::Visible
    $inputLoginPass.Focus()
})

# Logout Account Button
$btnAccountLogout.Add_Click({
    if (-not $script:selectedPort) { return }
    $cfg = Get-ClusterConfig
    $targetNick = "Porta $($script:selectedPort)"
    if ($cfg -and $cfg.accounts) {
        $acc = $cfg.accounts | Where-Object { $_.port -eq $script:selectedPort }
        if ($acc) {
            $targetNick = $acc.nick
            $acc.email = ""
        }
        Save-ClusterConfig $cfg
    }
    [System.Windows.MessageBox]::Show(
        "Você desvinculou as credenciais salvas de $targetNick.`nPara reconectar com novos dados, utilize 'Alterar Senha'.",
        "Sair da Conta",
        [System.Windows.MessageBoxButton]::OK,
        [System.Windows.MessageBoxImage]::Information
    ) | Out-Null
})

# Save Login Modal
$btnSaveLoginModal.Add_Click({
    $userVal = $inputLoginUser.Text.Trim()
    $passVal = $inputLoginPass.Password
    if (-not $userVal) {
        [System.Windows.MessageBox]::Show("Por favor, informe o usuário ou e-mail da conta.", "Aviso", [System.Windows.MessageBoxButton]::OK, [System.Windows.MessageBoxImage]::Warning) | Out-Null
        return
    }

    $cfg = Get-ClusterConfig
    if (-not $cfg) {
        $cfg = [PSCustomObject]@{
            accounts = @()
            hubPort = 4567
            economyMode = $true
            minCoinReserve = 50000
            autoCatcherEnabled = $true
        }
    }
    
    $accCfg = $null
    if ($cfg.accounts) {
        $accCfg = $cfg.accounts | Where-Object { $_.port -eq $script:selectedPort }
    }
    if ($accCfg) {
        $accCfg.email = $userVal
    } else {
        $newAcc = [PSCustomObject]@{
            id = "acc_$($script:selectedPort)"
            port = $script:selectedPort
            nick = $userVal
            email = $userVal
            profileDir = "C:\temp\pokeidle_profiles\acc_$($script:selectedPort)"
        }
        $cfg.accounts += $newAcc
    }
    Save-ClusterConfig $cfg

    [System.Windows.MessageBox]::Show("Credenciais salvas com sucesso localmente!", "Sucesso", [System.Windows.MessageBoxButton]::OK, [System.Windows.MessageBoxImage]::Information) | Out-Null

    $viewLoginModal.Visibility = [System.Windows.Visibility]::Collapsed
    if ($script:selectedPort) {
        $viewDetail.Visibility = [System.Windows.Visibility]::Visible
    } else {
        $viewSummary.Visibility = [System.Windows.Visibility]::Visible
    }
})

# Close/Cancel Login Modal
$btnCloseLoginModal.Add_Click({
    $viewLoginModal.Visibility = [System.Windows.Visibility]::Collapsed
    if ($script:selectedPort) {
        $viewDetail.Visibility = [System.Windows.Visibility]::Visible
    } else {
        $viewSummary.Visibility = [System.Windows.Visibility]::Visible
    }
})

$btnCancelLoginModal.Add_Click({
    $viewLoginModal.Visibility = [System.Windows.Visibility]::Collapsed
    if ($script:selectedPort) {
        $viewDetail.Visibility = [System.Windows.Visibility]::Visible
    } else {
        $viewSummary.Visibility = [System.Windows.Visibility]::Visible
    }
})

function Format-Coins([double]$val) {
    return $val.ToString("N0", [System.Globalization.CultureInfo]::GetCultureInfo("pt-BR"))
}

function Get-PokeSprite([string]$species) {
    if (-not $species) { return "https://play.pokemonshowdown.com/sprites/gen5/substitute.png" }
    $clean = $species.ToLower() -replace '[^a-z0-9-]', ''
    return "https://play.pokemonshowdown.com/sprites/gen5/$clean.png"
}

function Update-DetailView {
    if (-not $script:selectedPort) { return }
    $acc = $script:latestAccounts | Where-Object { $_.port -eq $script:selectedPort }
    if (-not $acc) { return }

    $txtDetailTitle.Text = "Conta: " + $acc.nick + " (Porta " + $acc.port + ")"
    $imgDetailPoke.Source = (New-Object System.Windows.Media.Imaging.BitmapImage (New-Object System.Uri (Get-PokeSprite $acc.species)))
    $txtDetailPokeName.Text = if ($acc.species -match 'Charmander') { "$emojiFire " + $acc.species } else { "$emojiHerb " + $acc.species }
    $txtDetailPokeLv.Text = "Nv. " + $acc.pokeLevel
    $txtDetailPower.Text = "$emojiSword Poder " + $acc.power

    # HP
    $hpCur = [double]$acc.hpCur
    $hpMax = [Math]::Max([double]$acc.hpMax, 1.0)
    $pbDetailHp.Maximum = $hpMax
    $pbDetailHp.Value = $hpCur
    $txtDetailHpVal.Text = "HP: " + $hpCur + " / " + $hpMax

    # XP
    $xpCur = [double]$acc.pokeXpCur
    $xpMax = [Math]::Max([double]$acc.pokeXpMax, 1.0)
    $pbDetailXp.Maximum = $xpMax
    $pbDetailXp.Value = $xpCur
    $txtDetailXpVal.Text = "XP: " + (Format-Coins $xpCur) + " / " + (Format-Coins $xpMax)

    # General
    $txtDetailCoins.Text = (Format-Coins $acc.coins) + " $emojiCoin"
    $txtDetailTrainerLv.Text = "Nível " + $acc.trainerLevel + " (" + (Format-Coins $acc.trainerXpCur) + " XP)"
    $txtDetailHunt.Text = ($acc.hunt -split '·')[0].Trim()
    $txtDetailPort.Text = "Porta " + $acc.port + " (Ativa)"

    # Filter account highlights
    $listAccountEvents.Children.Clear()
    $accEvents = $script:latestHighlights | Where-Object { $_.port -eq $script:selectedPort }
    if ($accEvents -and $accEvents.Count -gt 0) {
        foreach ($ev in ($accEvents | Select-Object -First 4)) {
            $grid = New-Object System.Windows.Controls.Grid
            $grid.Margin = New-Object System.Windows.Thickness(0, 2, 0, 2)
            $col0 = New-Object System.Windows.Controls.ColumnDefinition; $col0.Width = [System.Windows.GridLength]::new(20)
            $col1 = New-Object System.Windows.Controls.ColumnDefinition; $col1.Width = [System.Windows.GridLength]::new(1, [System.Windows.GridUnitType]::Star)
            $grid.ColumnDefinitions.Add($col0)
            $grid.ColumnDefinitions.Add($col1)

            $img = New-Object System.Windows.Controls.Image
            $img.Width = 16; $img.Height = 16
            $img.Source = (New-Object System.Windows.Media.Imaging.BitmapImage (New-Object System.Uri (Get-PokeSprite ($ev.species))))
            [System.Windows.Controls.Grid]::SetColumn($img, 0)
            $grid.Children.Add($img)

            $tb = New-Object System.Windows.Controls.TextBlock
            $tb.Text = $ev.message
            $tb.FontSize = 9; $tb.Foreground = [System.Windows.Media.Brushes]::LightSlateGray
            $tb.Margin = New-Object System.Windows.Thickness(4, 0, 0, 0)
            $tb.VerticalAlignment = [System.Windows.VerticalAlignment]::Center
            [System.Windows.Controls.Grid]::SetColumn($tb, 1)
            $grid.Children.Add($tb)

            $listAccountEvents.Children.Add($grid)
        }
    } else {
        $emptyTb = New-Object System.Windows.Controls.TextBlock
        $emptyTb.Text = "Nenhum evento registrado nesta hora."
        $emptyTb.FontSize = 8; $emptyTb.Foreground = [System.Windows.Media.Brushes]::Gray
        $listAccountEvents.Children.Add($emptyTb)
    }
}

function Refresh-RealTimeData {
    try {
        # Query local Webhook Hub (Port 4567)
        $resp = Invoke-RestMethod -Uri "http://127.0.0.1:4567/api/status" -TimeoutSec 1 -ErrorAction Stop
        if ($resp -and $resp.latest -and $resp.latest.accounts) {
            $script:latestAccounts = $resp.latest.accounts
            $script:latestHighlights = $resp.highlights

            # 1. Total Coins
            $total = 0
            foreach ($a in $script:latestAccounts) { $total += $a.coins }
            $txtTotalCoins.Text = Format-Coins $total

            # Update System Tray tooltip (max 63 chars for WinForms NotifyIcon)
            $totalFmt = Format-Coins $total
            $trayTip = "Pokéidle: $totalFmt Coins (Duplo clique)"
            if ($trayTip.Length -gt 63) { $trayTip = $trayTip.Substring(0, 63) }
            $notifyIcon.Text = $trayTip

            # 2. Account 1
            $acc1 = $script:latestAccounts | Where-Object { $_.port -eq 9222 }
            if ($acc1) {
                if ($acc1.nick) { $txtAcc1Nick.Text = "👤 " + $acc1.nick }
                $txtAcc1Trainer.Text = " · Nível " + $acc1.trainerLevel
                $txtAcc1Poke.Text = "$emojiFire " + $acc1.species + " Nv. " + $acc1.pokeLevel + " (" + $acc1.hpCur + "/" + $acc1.hpMax + " HP)"
                $txtAcc1Coins.Text = (Format-Coins $acc1.coins) + " $emojiCoin"
                $txtAcc1Hunt.Text = "Área: " + ($acc1.hunt -split '·')[0].Trim() + " · $emojiTarget Catcher Ativo"
                $imgAcc1Poke.Source = (New-Object System.Windows.Media.Imaging.BitmapImage (New-Object System.Uri (Get-PokeSprite $acc1.species)))
            }

            # 3. Account 2
            $acc2 = $script:latestAccounts | Where-Object { $_.port -eq 9223 }
            if ($acc2) {
                if ($acc2.nick) { $txtAcc2Nick.Text = "👤 " + $acc2.nick }
                $txtAcc2Trainer.Text = " · Nível " + $acc2.trainerLevel
                $txtAcc2Poke.Text = "$emojiHerb " + $acc2.species + " Nv. " + $acc2.pokeLevel + " (" + $acc2.hpCur + "/" + $acc2.hpMax + " HP)"
                $txtAcc2Coins.Text = (Format-Coins $acc2.coins) + " $emojiCoin"
                $txtAcc2Hunt.Text = "Área: " + ($acc2.hunt -split '·')[0].Trim() + " · $emojiTarget Catcher Ativo"
                $imgAcc2Poke.Source = (New-Object System.Windows.Media.Imaging.BitmapImage (New-Object System.Uri (Get-PokeSprite $acc2.species)))
            }

            # 4. Last Hour Highlights
            $validHighlights = $resp.highlights | Where-Object { $_.type -ne 'STATS_UPDATE' }
            $txtHighlightsCount.Text = "" + $validHighlights.Count + " eventos"
            $listHighlights.Children.Clear()

            if ($validHighlights.Count -gt 0) {
                foreach ($ev in ($validHighlights | Select-Object -First 4)) {
                    $grid = New-Object System.Windows.Controls.Grid
                    $grid.Margin = New-Object System.Windows.Thickness(0, 2, 0, 2)
                    $col0 = New-Object System.Windows.Controls.ColumnDefinition; $col0.Width = [System.Windows.GridLength]::new(20)
                    $col1 = New-Object System.Windows.Controls.ColumnDefinition; $col1.Width = [System.Windows.GridLength]::new(1, [System.Windows.GridUnitType]::Star)
                    $col2 = New-Object System.Windows.Controls.ColumnDefinition; $col2.Width = [System.Windows.GridLength]::new([System.Windows.GridLength]::Auto)
                    $grid.ColumnDefinitions.Add($col0)
                    $grid.ColumnDefinitions.Add($col1)
                    $grid.ColumnDefinitions.Add($col2)

                    $spName = if ($ev.species) { $ev.species } else { "substitute" }
                    $img = New-Object System.Windows.Controls.Image
                    $img.Width = 16; $img.Height = 16
                    $img.Source = (New-Object System.Windows.Media.Imaging.BitmapImage (New-Object System.Uri (Get-PokeSprite $spName)))
                    [System.Windows.Controls.Grid]::SetColumn($img, 0)
                    $grid.Children.Add($img)

                    $tb = New-Object System.Windows.Controls.TextBlock
                    $tb.Text = $ev.message
                    $tb.FontSize = 9; $tb.Foreground = [System.Windows.Media.Brushes]::WhiteSmoke
                    $tb.Margin = New-Object System.Windows.Thickness(4, 0, 0, 0)
                    $tb.VerticalAlignment = [System.Windows.VerticalAlignment]::Center
                    [System.Windows.Controls.Grid]::SetColumn($tb, 1)
                    $grid.Children.Add($tb)

                    # Time Ago
                    $diffMin = [Math]::Max(1, [int](([DateTimeOffset]::Now.ToUnixTimeMilliseconds() - $ev.timestamp) / 60000))
                    $tbTime = New-Object System.Windows.Controls.TextBlock
                    $tbTime.Text = "" + $diffMin + "m atrás"
                    $tbTime.FontSize = 8; $tbTime.Foreground = [System.Windows.Media.Brushes]::LightSlateGray
                    $tbTime.VerticalAlignment = [System.Windows.VerticalAlignment]::Center
                    [System.Windows.Controls.Grid]::SetColumn($tbTime, 2)
                    $grid.Children.Add($tbTime)

                    $listHighlights.Children.Add($grid)
                }
            } else {
                $tbEmpty = New-Object System.Windows.Controls.TextBlock
                $tbEmpty.Text = "Nenhum evento registrado nesta hora."
                $tbEmpty.FontSize = 8; $tbEmpty.Foreground = [System.Windows.Media.Brushes]::Gray
                $listHighlights.Children.Add($tbEmpty)
            }

            # Update Detail View if open
            if ($script:selectedPort) {
                Update-DetailView
            }

            $txtLastUpdate.Text = "Atualizado às " + (Get-Date).ToString("HH:mm:ss")
            $txtStatus.Text = "● Cluster Operando em Tempo Real"
            $txtStatus.Foreground = [System.Windows.Media.Brushes]::LightGreen
        }
    } catch {
        # Fallback to local file if webhook hub is restarting
        if (Test-Path $historyFile) {
            try {
                $raw = Get-Content $historyFile -Raw | ConvertFrom-Json
                $latest = $raw[-1]
                if ($latest -and $latest.accounts) {
                    $script:latestAccounts = $latest.accounts
                    $total = 0
                    foreach ($a in $script:latestAccounts) { $total += $a.coins }
                    $txtTotalCoins.Text = Format-Coins $total
                }
            } catch {}
        }
    }
}

# Initial Refresh
Refresh-RealTimeData

# Real-time Webhook Poller Timer (Every 1.5 seconds)
$timer = New-Object System.Windows.Threading.DispatcherTimer
$timer.Interval = [TimeSpan]::FromSeconds(1.5)
$timer.Add_Tick({
    Refresh-RealTimeData
})
$timer.Start()

# Show the HUD initially, activate and enter the WPF Application message loop
$window.Show()
$window.Activate()
$window.Topmost = $true

try {
    $notifyIcon.ShowBalloonTip(3000, "Pokéidle Cluster HUD", "HUD iniciada com sucesso! O ícone está disponível nos Ícones Ocultos da bandeja.", [System.Windows.Forms.ToolTipIcon]::Info)
} catch {}

$app.Run($window) | Out-Null
