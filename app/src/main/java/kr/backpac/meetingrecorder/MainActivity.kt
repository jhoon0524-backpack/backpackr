package kr.backpac.meetingrecorder

import android.Manifest
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : ComponentActivity() {

    private val permissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        requestNeededPermissions()
        setContent {
            MaterialTheme {
                MainScreen()
            }
        }
    }

    private fun requestNeededPermissions() {
        val permissions = buildList {
            add(Manifest.permission.RECORD_AUDIO)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                add(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
        permissionLauncher.launch(permissions.toTypedArray())
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MainScreen() {
    val context = LocalContext.current
    val phase by RecorderState.phase.collectAsState()
    val store = remember { MeetingStore(context) }
    var meetings by remember { mutableStateOf(store.listMeetings()) }
    var showSettings by remember { mutableStateOf(false) }
    var openedRecord by remember { mutableStateOf<MeetingRecord?>(null) }

    // 파이프라인이 끝날 때마다 목록 갱신
    LaunchedEffect(phase) {
        if (phase is RecorderPhase.Done || phase is RecorderPhase.Error) {
            meetings = store.listMeetings()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("회의록 레코더") },
                actions = {
                    TextButton(onClick = { showSettings = true }) { Text("설정") }
                },
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
        ) {
            RecordControlCard(phase)
            Spacer(Modifier.height(12.dp))
            SetupGuideCard()
            Spacer(Modifier.height(12.dp))
            Text("회의 기록", style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(8.dp))
            if (meetings.isEmpty()) {
                Text(
                    "아직 기록이 없습니다. 우측 버튼을 두 번 누르거나 위 버튼으로 녹음을 시작하세요.",
                    style = MaterialTheme.typography.bodyMedium,
                )
            } else {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(meetings, key = { it.baseName }) { record ->
                        MeetingItem(
                            record = record,
                            onOpen = { openedRecord = record },
                            onDelete = {
                                store.delete(record)
                                meetings = store.listMeetings()
                            },
                        )
                    }
                }
            }
        }
    }

    if (showSettings) {
        SettingsDialog(onDismiss = { showSettings = false })
    }

    openedRecord?.let { record ->
        MinutesDialog(record = record, onDismiss = { openedRecord = null })
    }
}

@Composable
private fun RecordControlCard(phase: RecorderPhase) {
    val context = LocalContext.current
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            when (phase) {
                is RecorderPhase.Recording -> {
                    var elapsed by remember { mutableStateOf(0L) }
                    LaunchedEffect(phase.startedAtMillis) {
                        while (true) {
                            elapsed = (System.currentTimeMillis() - phase.startedAtMillis) / 1000
                            delay(1000)
                        }
                    }
                    Text(
                        "🔴 녹음 중  ${"%02d:%02d".format(elapsed / 60, elapsed % 60)}",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                    )
                    Spacer(Modifier.height(12.dp))
                    Button(onClick = { RecordingService.toggle(context) }) {
                        Text("정지하고 회의록 만들기")
                    }
                }

                is RecorderPhase.Processing -> {
                    Text("⏳ ${phase.step}", style = MaterialTheme.typography.titleMedium)
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "완료되면 알림으로 알려드립니다.",
                        style = MaterialTheme.typography.bodySmall,
                    )
                }

                else -> {
                    if (phase is RecorderPhase.Error) {
                        Text(
                            "⚠️ ${phase.message}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.error,
                        )
                        Spacer(Modifier.height(8.dp))
                    }
                    Button(onClick = { RecordingService.toggle(context) }) {
                        Text("🎙 녹음 시작")
                    }
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "정지하면 전사와 회의록 생성이 자동으로 진행됩니다.",
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
            }
        }
    }
}

@Composable
private fun SetupGuideCard() {
    val context = LocalContext.current
    var expanded by remember { mutableStateOf(false) }
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("우측 버튼 두 번으로 녹음하기", style = MaterialTheme.typography.titleSmall)
                TextButton(onClick = { expanded = !expanded }) {
                    Text(if (expanded) "접기" else "설정 방법")
                }
            }
            if (expanded) {
                Text(
                    """
                    갤럭시: 설정 → 유용한 기능 → 사이드 키 → "두 번 누르기"를 "앱 열기"로 바꾸고 "빠른 녹음 (회의록)"을 선택하세요.

                    픽셀: 설정 → 시스템 → 동작 및 제스처 → 빠른 탭에서 "빠른 녹음 (회의록)"을 지정하세요.

                    보조 방법: 아래 버튼으로 접근성 서비스를 켜면, 화면이 켜진 상태에서 볼륨 상(上) 키를 빠르게 두 번 눌러 녹음을 시작/정지할 수 있습니다.
                    """.trimIndent(),
                    style = MaterialTheme.typography.bodySmall,
                )
                Spacer(Modifier.height(8.dp))
                FilledTonalButton(onClick = {
                    context.startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
                }) {
                    Text("접근성 설정 열기")
                }
            }
        }
    }
}

@Composable
private fun MeetingItem(
    record: MeetingRecord,
    onOpen: () -> Unit,
    onDelete: () -> Unit,
) {
    val dateText = remember(record.createdAtMillis) {
        SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.KOREA).format(Date(record.createdAtMillis))
    }
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(dateText, style = MaterialTheme.typography.titleSmall)
            Text(
                when {
                    record.hasMinutes -> "회의록 완료"
                    record.transcriptFile != null -> "전사만 완료"
                    else -> "녹음만 저장됨"
                },
                style = MaterialTheme.typography.bodySmall,
            )
            Spacer(Modifier.height(4.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (record.minutesFile != null || record.transcriptFile != null) {
                    TextButton(onClick = onOpen) { Text("열기") }
                }
                TextButton(onClick = onDelete) { Text("삭제") }
            }
        }
    }
}

@Composable
private fun MinutesDialog(record: MeetingRecord, onDismiss: () -> Unit) {
    val context = LocalContext.current
    val content = remember(record.baseName) {
        record.minutesFile?.readText()
            ?: record.transcriptFile?.readText()
            ?: "내용이 없습니다."
    }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("회의록") },
        text = {
            Column(modifier = Modifier.verticalScroll(rememberScrollState())) {
                Text(content, style = MaterialTheme.typography.bodySmall)
            }
        },
        confirmButton = {
            TextButton(onClick = {
                val share = Intent(Intent.ACTION_SEND).apply {
                    type = "text/plain"
                    putExtra(Intent.EXTRA_SUBJECT, "회의록 ${record.baseName}")
                    putExtra(Intent.EXTRA_TEXT, content)
                }
                context.startActivity(Intent.createChooser(share, "회의록 공유"))
            }) { Text("공유") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("닫기") }
        },
    )
}

@Composable
private fun SettingsDialog(onDismiss: () -> Unit) {
    val context = LocalContext.current
    val settings = remember { AppSettings(context) }
    var sttBaseUrl by remember { mutableStateOf(settings.sttBaseUrl) }
    var sttApiKey by remember { mutableStateOf(settings.sttApiKey) }
    var sttModel by remember { mutableStateOf(settings.sttModel) }
    var anthropicApiKey by remember { mutableStateOf(settings.anthropicApiKey) }
    var anthropicModel by remember { mutableStateOf(settings.anthropicModel) }
    var volumeToggle by remember { mutableStateOf(settings.volumeDoublePressEnabled) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("설정") },
        text = {
            Column(
                modifier = Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text("음성 전사 (OpenAI Whisper 호환)", style = MaterialTheme.typography.titleSmall)
                OutlinedTextField(
                    value = sttBaseUrl,
                    onValueChange = { sttBaseUrl = it },
                    label = { Text("베이스 URL") },
                    singleLine = true,
                )
                OutlinedTextField(
                    value = sttApiKey,
                    onValueChange = { sttApiKey = it },
                    label = { Text("API 키") },
                    singleLine = true,
                )
                OutlinedTextField(
                    value = sttModel,
                    onValueChange = { sttModel = it },
                    label = { Text("모델") },
                    singleLine = true,
                )
                HorizontalDivider()
                Text("회의록 요약 (Claude)", style = MaterialTheme.typography.titleSmall)
                OutlinedTextField(
                    value = anthropicApiKey,
                    onValueChange = { anthropicApiKey = it },
                    label = { Text("Anthropic API 키") },
                    singleLine = true,
                )
                OutlinedTextField(
                    value = anthropicModel,
                    onValueChange = { anthropicModel = it },
                    label = { Text("모델") },
                    singleLine = true,
                )
                HorizontalDivider()
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text("볼륨 상 키 2번 → 녹음 토글", style = MaterialTheme.typography.bodyMedium)
                    Switch(checked = volumeToggle, onCheckedChange = { volumeToggle = it })
                }
            }
        },
        confirmButton = {
            TextButton(onClick = {
                settings.sttBaseUrl = sttBaseUrl
                settings.sttApiKey = sttApiKey
                settings.sttModel = sttModel
                settings.anthropicApiKey = anthropicApiKey
                settings.anthropicModel = anthropicModel
                settings.volumeDoublePressEnabled = volumeToggle
                onDismiss()
            }) { Text("저장") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("취소") }
        },
    )
}
