package kr.backpac.meetingrecorder

import android.Manifest
import android.content.Context
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
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

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
    val phase by RecorderState.phase.collectAsState()
    val context = LocalContext.current
    val store = remember { MeetingStore(context) }
    val scope = rememberCoroutineScope()
    var meetings by remember { mutableStateOf<List<MeetingRecord>>(emptyList()) }
    var refreshKey by remember { mutableStateOf(0) }
    var showSettings by remember { mutableStateOf(false) }
    var openedRecord by remember { mutableStateOf<MeetingRecord?>(null) }

    // 최초 진입, 파이프라인 단계 변화, 삭제 후에 목록을 백그라운드 스레드에서 갱신
    LaunchedEffect(phase, refreshKey) {
        meetings = withContext(Dispatchers.IO) { store.listMeetings() }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.app_name)) },
                actions = {
                    TextButton(onClick = { showSettings = true }) {
                        Text(stringResource(R.string.action_settings))
                    }
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
            Text(
                stringResource(R.string.section_meetings),
                style = MaterialTheme.typography.titleMedium,
            )
            Spacer(Modifier.height(8.dp))
            if (meetings.isEmpty()) {
                Text(
                    stringResource(R.string.empty_meetings),
                    style = MaterialTheme.typography.bodyMedium,
                )
            } else {
                val pipelineBusy =
                    phase is RecorderPhase.Recording || phase is RecorderPhase.Processing
                LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(meetings, key = { it.baseName }) { record ->
                        MeetingItem(
                            record = record,
                            actionsEnabled = !pipelineBusy,
                            onOpen = { openedRecord = record },
                            onDelete = {
                                scope.launch {
                                    withContext(Dispatchers.IO) { store.delete(record) }
                                    refreshKey++
                                }
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
                        stringResource(
                            R.string.recording_elapsed,
                            "%02d:%02d".format(elapsed / 60, elapsed % 60),
                        ),
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                    )
                    Spacer(Modifier.height(12.dp))
                    Button(onClick = { RecordingService.toggle(context) }) {
                        Text(stringResource(R.string.action_stop_and_generate))
                    }
                }

                is RecorderPhase.Processing -> {
                    Text(
                        stringResource(R.string.processing_prefix, phase.step),
                        style = MaterialTheme.typography.titleMedium,
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        stringResource(R.string.processing_notice),
                        style = MaterialTheme.typography.bodySmall,
                    )
                }

                else -> {
                    if (phase is RecorderPhase.Error) {
                        Text(
                            stringResource(R.string.error_prefix, phase.message),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.error,
                        )
                        Spacer(Modifier.height(8.dp))
                    }
                    Button(onClick = { RecordingService.toggle(context) }) {
                        Text(stringResource(R.string.action_start_recording))
                    }
                    Spacer(Modifier.height(4.dp))
                    Text(
                        stringResource(R.string.start_hint),
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
                Text(
                    stringResource(R.string.guide_title),
                    style = MaterialTheme.typography.titleSmall,
                )
                TextButton(onClick = { expanded = !expanded }) {
                    Text(
                        stringResource(
                            if (expanded) R.string.action_collapse else R.string.action_show_guide,
                        ),
                    )
                }
            }
            if (expanded) {
                Text(
                    stringResource(R.string.guide_body),
                    style = MaterialTheme.typography.bodySmall,
                )
                Spacer(Modifier.height(8.dp))
                FilledTonalButton(onClick = {
                    context.startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
                }) {
                    Text(stringResource(R.string.action_open_accessibility))
                }
            }
        }
    }
}

@Composable
private fun MeetingItem(
    record: MeetingRecord,
    actionsEnabled: Boolean,
    onOpen: () -> Unit,
    onDelete: () -> Unit,
) {
    val context = LocalContext.current
    val dateText = remember(record.createdAtMillis) {
        MeetingStore.formatDateTime(record.createdAtMillis)
    }
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(dateText, style = MaterialTheme.typography.titleSmall)
            Text(
                stringResource(
                    when {
                        record.hasMinutes -> R.string.status_minutes_done
                        record.transcriptFile != null -> R.string.status_transcript_only
                        else -> R.string.status_audio_only
                    },
                ),
                style = MaterialTheme.typography.bodySmall,
            )
            Spacer(Modifier.height(4.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (record.minutesFile != null || record.transcriptFile != null) {
                    TextButton(onClick = onOpen) { Text(stringResource(R.string.action_open)) }
                }
                // 재시도(중간에 멈춘 기록)와 재생성(전사문 재활용)은 동작이 같고 라벨만 다르다.
                val actionLabel = when {
                    !record.hasMinutes -> R.string.action_retry
                    record.transcriptFile != null -> R.string.action_regenerate
                    else -> null
                }
                actionLabel?.let { label ->
                    TextButton(
                        enabled = actionsEnabled,
                        onClick = { RecordingService.processExisting(context, record.baseName) },
                    ) { Text(stringResource(label)) }
                }
                // 처리 중 삭제하면 파이프라인이 파일을 되살리는 유령 레코드가 생기므로 함께 잠근다.
                TextButton(enabled = actionsEnabled, onClick = onDelete) {
                    Text(stringResource(R.string.action_delete))
                }
            }
        }
    }
}

@Composable
private fun MinutesDialog(record: MeetingRecord, onDismiss: () -> Unit) {
    val context = LocalContext.current
    // 긴 전사문이 포함될 수 있어 파일은 백그라운드에서 읽는다.
    val content by produceState<String?>(initialValue = null, record.baseName) {
        value = withContext(Dispatchers.IO) {
            record.minutesFile?.readText()
                ?: record.transcriptFile?.readText()
                ?: ""
        }
    }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.dialog_minutes_title)) },
        text = {
            Column(modifier = Modifier.verticalScroll(rememberScrollState())) {
                Text(
                    when {
                        content == null -> stringResource(R.string.loading)
                        content.isNullOrBlank() -> stringResource(R.string.empty_content)
                        else -> content.orEmpty()
                    },
                    style = MaterialTheme.typography.bodySmall,
                )
            }
        },
        confirmButton = {
            TextButton(
                enabled = !content.isNullOrBlank(),
                onClick = { shareRecord(context, record, content.orEmpty()) },
            ) { Text(stringResource(R.string.action_share)) }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text(stringResource(R.string.action_close)) }
        },
    )
}

/**
 * 짧은 회의록은 텍스트로 바로 공유하고, 아주 긴 회의록은 인텐트 크기 한도
 * (binder ~1MB)를 넘지 않도록 파일로 공유한다.
 */
private fun shareRecord(context: Context, record: MeetingRecord, content: String) {
    val subject = context.getString(R.string.share_subject, record.baseName)
    val share = if (content.length <= MAX_SHARE_TEXT_CHARS) {
        Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_SUBJECT, subject)
            putExtra(Intent.EXTRA_TEXT, content)
        }
    } else {
        val file = record.minutesFile ?: record.transcriptFile ?: return
        val uri = FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            file,
        )
        Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_SUBJECT, subject)
            putExtra(Intent.EXTRA_STREAM, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
    }
    context.startActivity(
        Intent.createChooser(share, context.getString(R.string.share_chooser)),
    )
}

private const val MAX_SHARE_TEXT_CHARS = 100_000

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
        title = { Text(stringResource(R.string.settings_title)) },
        text = {
            Column(
                modifier = Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text(
                    stringResource(R.string.settings_stt_section),
                    style = MaterialTheme.typography.titleSmall,
                )
                OutlinedTextField(
                    value = sttBaseUrl,
                    onValueChange = { sttBaseUrl = it },
                    label = { Text(stringResource(R.string.settings_base_url)) },
                    singleLine = true,
                )
                OutlinedTextField(
                    value = sttApiKey,
                    onValueChange = { sttApiKey = it },
                    label = { Text(stringResource(R.string.settings_api_key)) },
                    singleLine = true,
                )
                OutlinedTextField(
                    value = sttModel,
                    onValueChange = { sttModel = it },
                    label = { Text(stringResource(R.string.settings_model)) },
                    singleLine = true,
                )
                HorizontalDivider()
                Text(
                    stringResource(R.string.settings_minutes_section),
                    style = MaterialTheme.typography.titleSmall,
                )
                OutlinedTextField(
                    value = anthropicApiKey,
                    onValueChange = { anthropicApiKey = it },
                    label = { Text(stringResource(R.string.settings_anthropic_key)) },
                    singleLine = true,
                )
                OutlinedTextField(
                    value = anthropicModel,
                    onValueChange = { anthropicModel = it },
                    label = { Text(stringResource(R.string.settings_model)) },
                    singleLine = true,
                )
                HorizontalDivider()
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        stringResource(R.string.settings_volume_toggle),
                        style = MaterialTheme.typography.bodyMedium,
                    )
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
            }) { Text(stringResource(R.string.action_save)) }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text(stringResource(R.string.action_cancel)) }
        },
    )
}
